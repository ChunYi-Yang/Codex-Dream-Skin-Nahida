[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$windowsRoot = Split-Path -Parent $PSScriptRoot
$source = [IO.File]::ReadAllText((Join-Path $windowsRoot 'scripts\install-dream-skin.ps1'))
$source = [regex]::Replace($source, '(?m)^\. \(Join-Path \$PSScriptRoot ''(?:common-windows|theme-windows)\.ps1''\)\r?\n', '')
$source = $source.Replace('$SkillRoot = Split-Path -Parent $PSScriptRoot', '$SkillRoot = ''fixture-source''')
$script:shortcuts = @()
$script:engine = [pscustomobject]@{
  Root = 'D:\新电脑 测试\engine'
  Node = 'D:\新电脑 测试\engine\runtime\node\node.exe'
  Launcher = 'D:\新电脑 测试\engine\scripts\launch-dream-skin.mjs'
  LoginLauncher = 'D:\新电脑 测试\engine\scripts\launch-dream-skin-at-login.mjs'
  Start = 'D:\新电脑 测试\engine\scripts\start-dream-skin.ps1'
  Restore = 'D:\新电脑 测试\engine\scripts\restore-dream-skin.ps1'
  Tray = 'D:\新电脑 测试\engine\scripts\tray-dream-skin.ps1'
}
function Enter-DreamSkinOperationLock { return 'fixture-lock' }
function Exit-DreamSkinOperationLock { param($Mutex) }
function Assert-DreamSkinPort { param($Port) }
function Get-DreamSkinNodeRuntime { return [pscustomobject]@{Path=$script:engine.Node} }
function Get-DreamSkinRegisteredCodexInstalls { return @([pscustomobject]@{Version='fixture'}) }
function Get-DreamSkinCodexProcesses { param($Codex); return @() }
function Get-DreamSkinThemePaths { param($StateRoot); return [pscustomobject]@{Root=$StateRoot;Active=$StateRoot} }
function Ensure-DreamSkinManagedDirectory { param($Path,$Root) }
function Read-DreamSkinState { param($Path); return $null }
function Get-DreamSkinCodexStatePathCandidate { param($State); return $null }
function Resolve-DreamSkinCodexInstallFromState { param($State,$RegisteredInstalls); return $null }
function Test-DreamSkinTrayActive { return $false }
function Install-DreamSkinRuntimeEngine { param($SkillRoot,$StateRoot); return $script:engine }
function Initialize-DreamSkinThemeStore { param($SkillRoot,$StateRoot) }
function Get-DreamSkinActiveThemeAppearance { param($ThemeDirectory); return 'auto' }
function Install-DreamSkinBaseTheme { param($ConfigPath,$BackupPath,$AppearanceTheme) }
function Start-Process { param($FilePath,$ArgumentList,$WindowStyle) }
function New-Object {
  param($ComObject)
  if ($ComObject -cne 'WScript.Shell') { throw 'Unexpected COM use.' }
  $shell = [pscustomobject]@{}
  $shell | Add-Member ScriptMethod CreateShortcut {
    param($Path)
    $link = [pscustomobject]@{Path=$Path;TargetPath='';Arguments='';WorkingDirectory='';Description=''}
    $link | Add-Member ScriptMethod Save { $script:shortcuts += $this }
    return $link
  }
  return $shell
}
& ([scriptblock]::Create($source)) -Port 9447
$launchers = @($script:shortcuts | Where-Object { [IO.Path]::GetFileName($_.Path) -ceq 'Codex Dream Skin.lnk' })
if ($launchers.Count -ne 2) { throw 'Desktop and Start Menu theme shortcuts are required.' }
foreach ($link in $launchers) {
  if ($link.TargetPath -cne $script:engine.Node -or
    $link.Arguments -cne ('"' + $script:engine.Launcher + '" --port 9447') -or
    $link.WorkingDirectory -cne $script:engine.Root) {
    throw 'Fresh shortcuts must use the managed launcher and destination-machine paths, including Unicode and spaces.'
  }
}
if ($script:shortcuts | Where-Object { [IO.Path]::GetFileName($_.Path) -ceq 'Codex.lnk' }) {
  throw 'The native Codex shortcut must remain untouched.'
}
Write-Host 'PASS: new-machine shortcuts use the managed launcher and preserve the native entry.'
