[CmdletBinding()]
param([string]$Root)
$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
. (Join-Path $Root 'scripts\common-windows.ps1')
$script:stopped = $false
$script:handle = $null
$script:visibleProcess = $null
function Get-Process { param($Id); return $script:handle }
function Get-CimInstance { param($ClassName, $Filter); return $script:visibleProcess }
function Stop-Process {
  param($InputObject, [switch]$Force)
  $script:stopped = $true
  $InputObject.HasExited = $true
}
function Set-Fixture {
  param([string]$StartedAt, [switch]$Unrelated)
  $script:stopped = $false
  $script:handle = [pscustomobject]@{StartTime=[datetime]::Parse($StartedAt).ToUniversalTime();HasExited=$false}
  $script:handle | Add-Member ScriptMethod WaitForExit { param($Milliseconds) }
  $script:visibleProcess = [pscustomobject]@{
    ExecutablePath = if ($Unrelated) { 'C:\Fixture\Other.exe' } else { 'C:\Fixture\node.exe' }
    CommandLine = if ($Unrelated) { 'Other.exe' } else { 'node.exe C:\Fixture\injector.mjs --watch --port 9335 --browser-id fixture-browser' }
  }
}
$state = [pscustomobject]@{
  injectorPid = 4242
  injectorStartedAt = '2026-01-01T10:00:00.0000000Z'
  injectorPath = 'C:\Fixture\injector.mjs'
  nodePath = 'C:\Fixture\node.exe'
  port = 9335
  browserId = 'fixture-browser'
}
Set-Fixture -StartedAt '2026-01-02T10:00:00.0000000Z' -Unrelated
if ((Stop-DreamSkinRecordedInjector -State $state) -ne $false -or $script:stopped) {
  throw 'A reused PID must be left running and reported as a stale record for archival.'
}
Set-Fixture -StartedAt $state.injectorStartedAt -Unrelated
$rejected = $false
try { $null = Stop-DreamSkinRecordedInjector -State $state } catch { $rejected = $_.Exception.Message -match 'State was preserved' }
if (-not $rejected -or $script:stopped) { throw 'A same-start identity mismatch must still fail closed.' }
Set-Fixture -StartedAt $state.injectorStartedAt
if (-not (Stop-DreamSkinRecordedInjector -State $state) -or -not $script:stopped) {
  throw 'An exact recorded injector must still be stopped.'
}
Set-Fixture -StartedAt '2026-01-02T10:00:00.0000000Z' -Unrelated
$state.injectorStartedAt = 'invalid-time'
$rejected = $false
try { $null = Stop-DreamSkinRecordedInjector -State $state } catch { $rejected = $_.Exception.Message -match 'State was preserved' }
if (-not $rejected -or $script:stopped) { throw 'An invalid timestamp cannot establish safe PID reuse.' }
Write-Host 'PASS: stale PID reuse preserves unrelated processes while exact and ambiguous identities remain guarded.'
