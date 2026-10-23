[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$windowsRoot = Split-Path -Parent $PSScriptRoot
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $windowsRoot 'installer\build-release.ps1'), [ref]$tokens, [ref]$errors)
$versionProbe = $ast.Find({ param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -ceq '$injectorVersionMatch'
}, $true)
foreach ($ending in @("`n", "`r`n")) {
  $injectorSource = 'const SKIN_VERSION = "1.6.0";' + $ending
  Invoke-Expression $versionProbe.Extent.Text
  if (-not $injectorVersionMatch.Success -or $injectorVersionMatch.Groups[1].Value -cne '1.6.0') {
    throw 'Release version discovery must accept both LF and CRLF checkouts.'
  }
}
$flavor = $ast.ParamBlock.Parameters | Where-Object { $_.Name.VariablePath.UserPath -eq 'ThemeFlavor' }
if ($null -eq $flavor -or $flavor.DefaultValue.Value -cne 'Nahida') {
  throw 'Default releases must ship the same layered Nahida theme as source installations.'
}
$builder = [IO.File]::ReadAllText((Join-Path $windowsRoot 'installer\build-release.ps1'))
$pin = [regex]::Match($builder, '\$publicPresetThemeSha256 = ''(?<hash>[a-f0-9]{64})''')
$metadata = Join-Path $windowsRoot 'presets\preset-gothic-void-crusade\theme.json'
if (-not $pin.Success -or (Get-FileHash -LiteralPath $metadata -Algorithm SHA256).Hash -ine $pin.Groups['hash'].Value) {
  throw 'Bundled preset metadata must match the reviewed build checksum after repository-link changes.'
}
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
