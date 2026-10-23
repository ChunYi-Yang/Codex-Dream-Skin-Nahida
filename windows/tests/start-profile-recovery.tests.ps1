[CmdletBinding()]
param([string]$Root)
$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
. (Join-Path $Root 'scripts\common-windows.ps1')
$codex = [pscustomobject]@{Executable='C:\Codex\ChatGPT.exe'}
$profile = 'D:\主题 配置\Profile-v3'
function Test-DreamSkinCodexPortOwner { param($Port, $Codex); return $Port -eq 9337 }
function Get-DreamSkinCdpBrowserIdentity { param($Port); if ($Port -eq 9337) { return [pscustomobject]@{BrowserId='verified-background-browser'} }; return $null }
$script:candidates = @()
$script:verifiedPorts = @()
function Get-DreamSkinCodexProcesses { param($Codex); return $script:candidates }
function Get-DreamSkinVerifiedCdpIdentity {
  param($Port, $Codex)
  $script:verifiedPorts += $Port
  if ($Port -eq 9337) { return [pscustomobject]@{BrowserId='verified-browser'} }
  return $null
}
$script:candidates = @(
  [pscustomobject]@{CommandLine='ChatGPT.exe --remote-debugging-port=9444 --user-data-dir=D:\unrelated'},
  [pscustomobject]@{CommandLine='ChatGPT.exe --type=renderer --remote-debugging-port=9337'},
  [pscustomobject]@{CommandLine='ChatGPT.exe --remote-debugging-address=127.0.0.1 --remote-debugging-port=9337 "--user-data-dir=D:\主题 配置\Profile-v3"'}
)
$found = Find-DreamSkinRunningProfilePort -Codex $codex -ProfilePath $profile
if ($found -ne 9337) { throw 'Missing state must recover the verified port of the exact existing profile.' }
if ($script:verifiedPorts -contains 9444) { throw 'An unrelated profile must never be probed or adopted.' }
$script:candidates = @([pscustomobject]@{CommandLine='ChatGPT.exe --remote-debugging-port=9555 "--user-data-dir=D:\主题 配置\Profile-v3"'})
if ($null -ne (Find-DreamSkinRunningProfilePort -Codex $codex -ProfilePath $profile)) { throw 'Unverified port adopted.' }
Write-Host 'PASS: missing state recovers only an exact profile with a verified loopback endpoint.'
$script:candidates = @([pscustomobject]@{CommandLine='ChatGPT.exe --remote-debugging-port=9337 "--user-data-dir=D:\主题 配置\Profile-v3"'})
function Get-DreamSkinCdpTargets { param($Port); return @() }
if ((Find-DreamSkinRunningProfilePort -Codex $codex -ProfilePath $profile) -ne 9337) {
  throw 'A verified browser with no page targets must remain recoverable.'
}
Write-Host 'PASS: a closed-window browser is recoverable without page targets.'
$script:activatedPid = $null
$script:candidates = @(
  [pscustomobject]@{ProcessId=10;CommandLine='ChatGPT.exe'},
  [pscustomobject]@{ProcessId=20;CommandLine='ChatGPT.exe --remote-debugging-port=9337'},
  [pscustomobject]@{ProcessId=30;CommandLine='ChatGPT.exe --type=renderer --remote-debugging-port=9337'}
)
function New-Object {
  param([string]$ComObject)
  if ($ComObject -ne 'WScript.Shell') { throw 'Unexpected COM activation.' }
  $shell = [pscustomobject]@{}
  $shell | Add-Member ScriptMethod AppActivate {
    param([int]$ProcessId)
    $script:activatedPid = $ProcessId
    return $true
  }
  return $shell
}
if (-not (Invoke-DreamSkinCodexWindowActivation -Codex $codex) -or $script:activatedPid -ne 20) {
  throw 'Desktop activation must prefer the themed main window over stock Codex and child renderers.'
}
Write-Host 'PASS: desktop activation prefers the themed main window.'
$script:reopened = $false
function Invoke-CommandInDesktopPackage {
  [CmdletBinding()]
  param($PackageFamilyName, $AppId, $Command, $Args, [switch]$PreventBreakaway)
  if ($Args -notlike '*--remote-debugging-port=9337*' -or
    $Args -notlike '*--user-data-dir=D:\主题 配置\Profile-v3*' -or -not $PreventBreakaway) {
    throw "Reopening must retain the verified port, exact profile, and package identity: [$Args], [$PreventBreakaway]"
  }
  $script:reopened = $true
}
Resume-DreamSkinCodexWindow -Codex $codex -Port 9337 -ProfilePath $profile
if (-not $script:reopened) { throw 'An existing background-only themed instance must receive package activation.' }
Write-Host 'PASS: package activation reopens the exact existing themed profile.'
$script:independentReady = $false
$script:independentLaunches = 0
function Find-DreamSkinRunningProfilePort {
  param($Codex, $ProfilePath)
  if ($script:independentReady) { return 9337 }
  return $null
}
function Test-DreamSkinPortAvailable { param($Port); return $true }
function Start-DreamSkinCodexDirect {
  param($Codex, $Arguments)
  if ($Arguments -notcontains "--user-data-dir=$profile" -or
    $Arguments -notcontains '--remote-debugging-address=127.0.0.1') { throw 'Wrong independent profile arguments.' }
  $script:independentLaunches++
  $script:independentReady = $true
  return 99
}
function Stop-DreamSkinCodex { throw 'Stock Codex must survive the independent launch.' }
Open-DreamSkinIndependentProfile -Codex $codex -Port 9337 -ProfilePath $profile
Open-DreamSkinIndependentProfile -Codex $codex -Port 9337 -ProfilePath $profile
if ($script:independentLaunches -ne 1) { throw 'Independent launch must open once, then reuse the exact profile.' }
Write-Host 'PASS: stock background processes do not block the independent themed profile.'
