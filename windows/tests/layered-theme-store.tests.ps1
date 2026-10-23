[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$windowsRoot=Split-Path -Parent $PSScriptRoot
. (Join-Path $windowsRoot 'scripts\common-windows.ps1')
. (Join-Path $windowsRoot 'scripts\theme-windows.ps1')
$testRoot=Join-Path ([System.IO.Path]::GetTempPath()) ('nahida-layered-store-'+[guid]::NewGuid().ToString('N'))
try {
  $paths=Initialize-DreamSkinThemeStore -SkillRoot $windowsRoot -StateRoot $testRoot
  $preset=Read-DreamSkinTheme -ThemeDirectory (Join-Path $paths.Saved 'nahida-dream')
  foreach($property in $preset.Theme.images.PSObject.Properties) {
    if(-not(Test-Path -LiteralPath (Join-Path $preset.Directory $property.Value) -PathType Leaf)) { throw "Saved preset lacks image slot: $($property.Name)" }
  }
  $saved=Save-DreamSkinCurrentTheme -Name '中文 玻璃主题' -StateRoot $testRoot
  foreach($property in $saved.Theme.images.PSObject.Properties) {
    if(-not(Test-Path -LiteralPath (Join-Path $saved.Directory $property.Value) -PathType Leaf)) { throw "Saved custom theme lacks image slot: $($property.Name)" }
  }
  $layerName = $saved.Theme.images.background
  $expectedHash = (Get-FileHash -LiteralPath (Join-Path $saved.Directory $layerName) -Algorithm SHA256).Hash
  Copy-Item -LiteralPath (Join-Path $windowsRoot 'assets\nahida-sidebar.jpg') -Destination (Join-Path $paths.Active $layerName) -Force
  $restored = Use-DreamSkinSavedTheme -ThemeDirectory $saved.Directory -StateRoot $testRoot
  $actualHash = (Get-FileHash -LiteralPath (Join-Path $paths.Active $restored.Theme.images.background) -Algorithm SHA256).Hash
  if ($actualHash -cne $expectedHash) { throw 'Restored theme did not restore its saved artwork snapshot.' }
  Write-Host 'PASS: seeded and saved themes retain every layered artwork file.'
} finally {
  $resolved=[System.IO.Path]::GetFullPath($testRoot)
  $boundary=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if(-not $resolved.StartsWith($boundary,[StringComparison]::OrdinalIgnoreCase)){throw 'Temporary cleanup target escaped temp'}
  if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue}
}
