[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
$commonPath = Join-Path $Root 'scripts\common-windows.ps1'
$source = [System.IO.File]::ReadAllText($commonPath)

if ($source -match '(?s)if \(-not \$processPath -or -not \$commandLine\) \{\s*throw') {
  throw 'A reused injector PID still aborts startup instead of being treated as stale state.'
}
if (-not $source.Contains('Skipped stale injector PID')) {
  throw 'Startup no longer reports a reused injector PID as stale state.'
}

Write-Output 'PASS: reused injector PIDs are treated as stale state.'
