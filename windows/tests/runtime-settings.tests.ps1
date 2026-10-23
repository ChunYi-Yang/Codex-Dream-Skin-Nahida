[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\scripts\runtime-settings.ps1')
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('nahida-settings-' + [guid]::NewGuid().ToString('N'))
try {
  New-Item -ItemType Directory -Path (Join-Path $testRoot 'Profile-v3') -Force | Out-Null
  $legacy = Resolve-DreamSkinRuntimeSettings -StateRoot $testRoot
  if ($legacy.profilePath -cne (Join-Path $testRoot 'Profile-v3') -or $legacy.port -ne 9335) { throw 'Existing profile was not retained' }
  $saved = [pscustomobject]@{profilePath=(Join-Path $testRoot '中文 配置');port=9341}
  $settings = Resolve-DreamSkinRuntimeSettings -StateRoot $testRoot -SavedState $saved
  if ($settings.profilePath -cne $saved.profilePath -or $settings.port -ne 9341) { throw 'Saved settings differ across entry points' }
  $blocked = $false
  try { Resolve-DreamSkinRuntimeSettings -StateRoot $testRoot -SavedState ([pscustomobject]@{profilePath='D:\outside'}) | Out-Null } catch { $blocked=$true }
  if (-not $blocked) { throw 'Saved profile escaped its state directory' }
  Write-Host 'PASS: consistent profile selection and bounded saved settings.'
} finally {
  $resolved=[System.IO.Path]::GetFullPath($testRoot)
  $tempBoundary=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if (-not $resolved.StartsWith($tempBoundary,[StringComparison]::OrdinalIgnoreCase)) { throw 'Temporary cleanup path escaped temp' }
  Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
}
