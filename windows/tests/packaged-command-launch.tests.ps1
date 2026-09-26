[CmdletBinding()]
param([string]$Root)

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
. (Join-Path $Root 'scripts\common-windows.ps1')

# The real helper is exercised with no app launches or filesystem cleanup.
$codex = [pscustomobject]@{
  PackageRoot = 'C:\Program Files\WindowsApps\OpenAI.Codex_fixture'
  Executable = 'C:\Program Files\WindowsApps\OpenAI.Codex_fixture\app\ChatGPT.exe'
  PackageFullName = 'OpenAI.Codex_fixture'
  PackageFamilyName = 'OpenAI.Codex_test'
  ApplicationId = 'App'
  AppUserModelId = 'OpenAI.Codex_test!App'
  SignatureKind = 'Store'
}
$script:activationCalls = 0
$script:processReads = 0
$script:rejectActivation = $false

function Test-Path { param($LiteralPath, $PathType) return $LiteralPath -ceq $codex.Executable }
function Start-Process { throw 'Unpackaged EXE launch must never run.' }
function Get-DreamSkinCodexProcesses {
  param($Codex)
  $script:processReads += 1
  $existing = [pscustomobject]@{ ProcessId = 10; CommandLine = '"ChatGPT.exe"' }
  if ($script:processReads -eq 1) { return @($existing) }
  return @(
    $existing,
    [pscustomobject]@{ ProcessId = 20; CommandLine = '"ChatGPT.exe" --type=renderer' },
    [pscustomobject]@{ ProcessId = 30; CommandLine = '"ChatGPT.exe" --remote-debugging-port=9335' }
  )
}
function Invoke-CommandInDesktopPackage {
  [CmdletBinding()]
  param($PackageFamilyName, $AppId, $Command, $Args, [switch]$PreventBreakaway)
  $script:activationCalls += 1
  if ($PackageFamilyName -cne 'OpenAI.Codex_test' -or $AppId -cne 'App' -or
    $Command -cne $codex.Executable -or -not $PreventBreakaway -or
    $Args -cne '--remote-debugging-address=127.0.0.1 --remote-debugging-port=9335 "--user-data-dir=D:\主题 测试\配置"') {
    throw 'Package identity, loopback arguments, or Unicode profile quoting was lost.'
  }
  if ($script:rejectActivation) { throw [System.UnauthorizedAccessException]::new('denied') }
}

$arguments = @('--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9335', '--user-data-dir=D:\主题 测试\配置')
$launchedId = Start-DreamSkinCodexDirect -Codex $codex -Arguments $arguments
if ($launchedId -ne 30 -or $script:activationCalls -ne 1) {
  throw 'Package command launch confused the new main process with a preexisting process or child.'
}

$invalidCodex = $codex.PSObject.Copy()
$invalidCodex.AppUserModelId = 'OpenAI.Codex_other!App'
$rejected = $false
try { $null = Start-DreamSkinCodexDirect -Codex $invalidCodex -Arguments $arguments } catch { $rejected = $true }
if (-not $rejected -or $script:activationCalls -ne 1) {
  throw 'An invalid package identity reached command activation.'
}

$script:rejectActivation = $true
$failureKind = $null
try { $null = Start-DreamSkinCodexDirect -Codex $codex -Arguments $arguments } catch {
  $failureKind = Get-DreamSkinDirectLaunchFailureKind -Exception $_.Exception
}
if ($failureKind -cne 'access-denied' -or $script:activationCalls -ne 2) {
  throw 'Package activation failure was hidden or retried outside the package.'
}

Write-Output 'PASS: packaged commands preserve identity, loopback switches, Unicode arguments, and fail closed.'
