[CmdletBinding()]
param(
  [switch]$CheckOnly,
  [switch]$PrepareOnly,
  [switch]$Worker,
  [ValidateRange(30, 3600)][int]$WaitTimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
if (@(@($CheckOnly, $PrepareOnly, $Worker) | Where-Object { $_ }).Count -gt 1) {
  throw 'Choose only one setup mode.'
}
. (Join-Path $PSScriptRoot 'scripts\common-windows.ps1')
. (Join-Path $PSScriptRoot 'scripts\theme-windows.ps1')
$registered = @(Get-DreamSkinRegisteredCodexInstalls)
if ($registered.Count -eq 0) { throw 'Install the official Microsoft Store OpenAI.Codex app first.' }
$runtimeDirectory = Join-Path $PSScriptRoot 'runtime\node'
$bundledNode = Join-Path $runtimeDirectory 'node.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$node = $null
if (Test-Path -LiteralPath $bundledNode) {
  $node = Get-DreamSkinValidatedNodeRuntime -Path $bundledNode
} elseif ($nodeCommand) {
  $node = Get-DreamSkinValidatedNodeRuntime -Path $nodeCommand.Source
}
if ($CheckOnly) {
  [pscustomobject]@{
    storePackage = $true
    nodeReady = ($null -ne $node)
    nodeVersion = if ($node) { $node.Version } else { $null }
    nextStep = if ($node) { 'Run setup.ps1 -PrepareOnly' } else { 'Run setup.ps1 -PrepareOnly to download the pinned signed Node runtime' }
  } | ConvertTo-Json
  return
}
if (-not $node) {
  $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'installer\node-runtime.json') -Raw | ConvertFrom-Json
  if ($manifest.url -cne 'https://nodejs.org/dist/v22.23.1/node-v22.23.1-win-x64.zip' -or
    $manifest.sha256 -cne '7df0bc9375723f4a86b3aa1b7cc73342423d9677a8df4538aca31a049e309c29' -or
    $manifest.nodeEntry -cne 'node-v22.23.1-win-x64/node.exe' -or
    $manifest.licenseEntry -cne 'node-v22.23.1-win-x64/LICENSE') {
    throw 'The pinned Node manifest differs from the reviewed runtime.'
  }
  Assert-DreamSkinNoReparseComponents -Path $runtimeDirectory
  if (Test-Path -LiteralPath $runtimeDirectory) { throw 'Runtime directory already exists; inspect it before retrying.' }
  $downloadRoot = Join-Path ([IO.Path]::GetTempPath()) ('dream-skin-setup-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $downloadRoot | Out-Null
  try {
    $archivePath = Join-Path $downloadRoot 'node.zip'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $manifest.url -OutFile $archivePath -UseBasicParsing
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ine $manifest.sha256) {
      throw 'Node archive SHA-256 mismatch.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
      foreach ($entryName in @($manifest.nodeEntry, $manifest.licenseEntry)) {
        $entry = $archive.GetEntry($entryName)
        if (-not $entry -or $entry.Length -le 0 -or $entry.Length -gt 150MB) { throw 'Invalid Node archive entry.' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $downloadRoot ([IO.Path]::GetFileName($entryName))))
      }
    } finally { $archive.Dispose() }
    $null = Get-DreamSkinValidatedNodeRuntime -Path (Join-Path $downloadRoot 'node.exe')
    New-Item -ItemType Directory -Path $runtimeDirectory | Out-Null
    Copy-Item -LiteralPath (Join-Path $downloadRoot 'node.exe'), (Join-Path $downloadRoot 'LICENSE') -Destination $runtimeDirectory
    $node = Get-DreamSkinValidatedNodeRuntime -Path $bundledNode
  } finally {
    # Only this invocation's randomly named download directory is disposable.
    Remove-Item -LiteralPath $downloadRoot -Recurse -Force
  }
}
if ($PrepareOnly) {
  Write-Host "Ready: signed Node $($node.Version). Run setup.ps1 to wait for Codex to close and install."
  return
}
$stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
Ensure-DreamSkinManagedDirectory -Path $stateRoot -Root $stateRoot
$statusPath = Join-Path $stateRoot 'conversation-install.json'
if (-not $Worker) {
  $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $arguments = "-NoProfile -ExecutionPolicy RemoteSigned -File `"$PSCommandPath`" -Worker -WaitTimeoutSeconds $WaitTimeoutSeconds"
  $process = Start-Process -FilePath $powershell -ArgumentList $arguments -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $stateRoot 'conversation-install.out.log') `
    -RedirectStandardError (Join-Path $stateRoot 'conversation-install.err.log')
  Write-Host "Installer prepared (PID $($process.Id)). Save your input, then exit Codex normally. Status: $statusPath"
  return
}
function Write-SetupStatus {
  param([string]$Stage, [string]$Message)
  Write-DreamSkinUtf8FileAtomically -Path $statusPath -Content (([pscustomobject]@{
    stage = $Stage; message = $Message; updatedAt = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json) + "`r`n")
}
$setupMutex = [Threading.Mutex]::new($false, ('Local\CodexDreamSkinSetup-' + [Security.Principal.WindowsIdentity]::GetCurrent().User.Value))
$setupAcquired = $false
try {
  try { $setupAcquired = $setupMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $setupAcquired = $true }
  if (-not $setupAcquired) { throw 'Another conversation installation is already waiting or running.' }
  Write-SetupStatus 'waiting' 'Save your work and exit Codex normally.'
  $deadline = [DateTime]::UtcNow.AddSeconds($WaitTimeoutSeconds)
  do {
    $running = @($registered | Where-Object { (Get-DreamSkinCodexProcesses -Codex $_).Count -gt 0 })
    if ($running.Count -eq 0) { break }
    if ([DateTime]::UtcNow -ge $deadline) { throw 'Timed out waiting for Codex to close. No forced exit was attempted.' }
    Start-Sleep -Seconds 2
  } while ($true)
  Write-SetupStatus 'installing' 'Installing the managed theme engine.'
  & (Join-Path $PSScriptRoot 'scripts\install-dream-skin.ps1')
  $engine = Get-DreamSkinRuntimeEnginePaths -StateRoot $stateRoot
  Write-SetupStatus 'starting' 'Starting Codex and verifying the theme.'
  & $engine.Start -ProfilePath (Join-Path $stateRoot 'Profile-v3')
  Write-SetupStatus 'verified' 'Startup verification passed. Check home and task appearance in Codex.'
} catch {
  if ($setupAcquired) { Write-SetupStatus 'failed' $_.Exception.Message }
  throw
} finally {
  if ($setupAcquired) { $setupMutex.ReleaseMutex() }
  $setupMutex.Dispose()
}
