[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$NoShortcuts
)

$ErrorActionPreference = 'Stop'
$PortExplicit = $PSBoundParameters.ContainsKey('Port')
$SkillRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'common-windows.ps1')

$operationLock = Enter-DreamSkinOperationLock
try {
  Assert-DreamSkinPort -Port $Port
  $node = Get-DreamSkinNodeRuntime
  $nodeSignature = Get-AuthenticodeSignature -LiteralPath $node.Path
  if ($nodeSignature.Status -ne 'Valid') {
    throw 'The selected Node.js runtime must have a valid Authenticode signature for shortcut launch.'
  }
  $registeredInstalls = @(Get-DreamSkinRegisteredCodexInstalls)
  if ($registeredInstalls.Count -eq 0) {
    throw 'The official OpenAI.Codex Store package is not installed or its identity cannot be validated.'
  }
  foreach ($registeredCodex in $registeredInstalls) {
    if ((Get-DreamSkinCodexProcesses -Codex $registeredCodex).Count -gt 0) {
      throw 'Close Codex before installing Dream Skin so config.toml cannot change during the transaction.'
    }
  }

  $StateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
  $StatePath = Join-Path $StateRoot 'state.json'
  $existingState = Read-DreamSkinState -Path $StatePath
  $savedPathCandidate = Get-DreamSkinCodexStatePathCandidate -State $existingState
  $savedCodex = Resolve-DreamSkinCodexInstallFromState -State $existingState -RegisteredInstalls $registeredInstalls
  if ($null -ne $savedPathCandidate -and $null -eq $savedCodex -and
    (Get-DreamSkinCodexProcesses -Codex $savedPathCandidate).Count -gt 0) {
    throw 'The saved Codex path is still running but no longer matches a registered Store package. Close it manually before installing.'
  }
  New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null
  $ConfigPath = Join-Path $HOME '.codex\config.toml'
  $BackupPath = Join-Path $StateRoot 'config.before-dream-skin.toml'
  Install-DreamSkinBaseTheme -ConfigPath $ConfigPath -BackupPath $BackupPath

  if (-not $NoShortcuts) {
    $shell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
    $startup = Join-Path $startMenu 'Startup'
    $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $restoreScript = Join-Path $PSScriptRoot 'restore-dream-skin.ps1'
    $launcher = $node.Path
    $launcherScript = Join-Path $PSScriptRoot 'launch-dream-skin.mjs'
    $autoStartLauncherScript = Join-Path $PSScriptRoot 'launch-dream-skin-at-login.mjs'
    $portArgument = if ($PortExplicit) { " -Port $Port" } else { '' }
    $launcherArguments = ConvertTo-DreamSkinProcessArgument -Value $launcherScript
    if ($PortExplicit) { $launcherArguments += " --port $Port" }
    $autoStartArguments = ConvertTo-DreamSkinProcessArgument -Value $autoStartLauncherScript
    if ($PortExplicit) { $autoStartArguments += " --port $Port" }
    $desktopCodex = Join-Path $desktop 'Codex.lnk'
    $desktopCodexBackup = Join-Path $StateRoot 'desktop-codex.before-dream-skin.lnk'
    $desktopIcon = ''

    if (Test-Path -LiteralPath $desktopCodex) {
      $existingDesktop = $shell.CreateShortcut($desktopCodex)
      $desktopIcon = "$($existingDesktop.IconLocation)"
      $alreadyUsesDreamSkin = (Test-DreamSkinPathEqual -Left $existingDesktop.TargetPath -Right $launcher) -and
        (Test-DreamSkinCommandLineToken -CommandLine "$($existingDesktop.Arguments)" -Token $launcherScript)
      if (-not $alreadyUsesDreamSkin -and -not (Test-Path -LiteralPath $desktopCodexBackup)) {
        Copy-Item -LiteralPath $desktopCodex -Destination $desktopCodexBackup -ErrorAction Stop
      }
    }
    if (-not $desktopIcon -and (Test-Path -LiteralPath $desktopCodexBackup)) {
      $desktopIcon = "$($shell.CreateShortcut($desktopCodexBackup).IconLocation)"
    }
    if (-not $desktopIcon) {
      $desktopIcon = "$((Get-DreamSkinCodexInstall).Executable),0"
    }

    $desktopShortcut = $shell.CreateShortcut($desktopCodex)
    $desktopShortcut.TargetPath = $launcher
    $desktopShortcut.Arguments = $launcherArguments
    $desktopShortcut.WorkingDirectory = $SkillRoot
    $desktopShortcut.Description = 'Launch the official Codex app with Codex Dream Skin'
    $desktopShortcut.IconLocation = $desktopIcon
    $desktopShortcut.WindowStyle = 7
    $desktopShortcut.Save()

    foreach ($startMenuName in @('Codex.lnk', 'Codex Dream Skin.lnk')) {
      $startMenuShortcut = $shell.CreateShortcut((Join-Path $startMenu $startMenuName))
      $startMenuShortcut.TargetPath = $launcher
      $startMenuShortcut.Arguments = $launcherArguments
      $startMenuShortcut.WorkingDirectory = $SkillRoot
      $startMenuShortcut.Description = 'Launch the official Codex app with Codex Dream Skin'
      $startMenuShortcut.IconLocation = $desktopIcon
      $startMenuShortcut.WindowStyle = 7
      $startMenuShortcut.Save()
    }

    New-Item -ItemType Directory -Force -Path $startup | Out-Null
    $autoStartShortcut = $shell.CreateShortcut((Join-Path $startup 'Codex Dream Skin Auto Start.lnk'))
    $autoStartShortcut.TargetPath = $launcher
    $autoStartShortcut.Arguments = $autoStartArguments
    $autoStartShortcut.WorkingDirectory = $SkillRoot
    $autoStartShortcut.Description = 'Start Codex Dream Skin automatically after Windows sign-in'
    $autoStartShortcut.IconLocation = $desktopIcon
    $autoStartShortcut.WindowStyle = 7
    $autoStartShortcut.Save()

    $restore = $shell.CreateShortcut((Join-Path $desktop 'Codex Dream Skin - Restore.lnk'))
    $restore.TargetPath = $powershell
    $restore.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$restoreScript`"$portArgument -RestoreBaseTheme -PromptRestart"
    $restore.WorkingDirectory = $SkillRoot
    $restore.Description = 'Restore the official Codex appearance and close the CDP session'
    $restore.Save()
  }

  if ($NoShortcuts) {
    Write-Host 'Codex Dream Skin base theme installed. Run start-dream-skin.ps1 to launch it.'
  } else {
    Write-Host 'Codex Dream Skin installed. Desktop and Start Menu shortcuts launch the theme, and a delayed login shortcut keeps it active after Windows restarts.'
  }
} finally {
  Exit-DreamSkinOperationLock -Mutex $operationLock
}
