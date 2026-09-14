[CmdletBinding()]
param(
  [int]$Port = 9335
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common-windows.ps1')

$statePath = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin\state.json'
$state = Read-DreamSkinState -Path $statePath
if ($null -eq $state) { throw 'No active Dream Skin session was found.' }
if (-not $PSBoundParameters.ContainsKey('Port') -and $state.port) { $Port = [int]$state.port }
Assert-DreamSkinPort -Port $Port

$node = Get-DreamSkinNodeRuntime
$injector = [string]$state.injectorPath
if (-not $injector -or -not (Test-Path -LiteralPath $injector -PathType Leaf)) {
  throw 'The active Dream Skin injector path is unavailable.'
}
if (-not $state.browserId) { throw 'The active Dream Skin session has no pinned browser identity.' }

& $node.Path $injector --once --port $Port --browser-id ([string]$state.browserId)
if ($LASTEXITCODE -ne 0) { throw "Dream Skin hot reload failed with exit code $LASTEXITCODE." }
Write-Host "Dream Skin hot reloaded on verified loopback port $Port without restarting Codex."
