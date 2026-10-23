[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$windowsRoot = Split-Path -Parent $PSScriptRoot
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $windowsRoot 'installer\build-release.ps1'), [ref]$tokens, [ref]$errors)
$function = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-NahidaReleaseAssets' }, $true)
if ($null -eq $function) { throw 'Local Nahida staging validator is missing.' }
Invoke-Expression $function.Extent.Text
$assets = Join-Path $windowsRoot 'assets'
Assert-NahidaReleaseAssets -AssetRoot $assets
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('nahida-installer-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
try {
  $theme = [System.IO.File]::ReadAllText((Join-Path $assets 'theme.json'), [System.Text.Encoding]::UTF8) | ConvertFrom-Json
  $theme.images.background = '..\escape.jpg'
  $theme | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $testRoot 'theme.json') -Encoding UTF8
  $rejected = $false
  try { Assert-NahidaReleaseAssets -AssetRoot $testRoot } catch { $rejected = $true }
  if (-not $rejected) { throw 'Unsafe or missing layered assets were accepted.' }
  Write-Host 'PASS: local Nahida staging validates seven safe nonempty artwork files.'
} finally {
  $boundary = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  if (-not [System.IO.Path]::GetFullPath($testRoot).StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Temporary cleanup escaped temp' }
  Remove-Item -LiteralPath $testRoot -Recurse -Force
}
