function Resolve-DreamSkinRuntimeSettings {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [AllowNull()][object]$SavedState,
    [string]$ExplicitProfile,
    [Nullable[int]]$ExplicitPort
  )
  if (-not [System.IO.Path]::IsPathRooted($StateRoot)) { throw 'State root must be absolute.' }
  $rootPath=[System.IO.Path]::GetFullPath($StateRoot).TrimEnd('\')
  $savedProfile=$null
  if ($null -ne $SavedState -and $SavedState.PSObject.Properties['profilePath']) { $savedProfile=$SavedState.profilePath }
  if ($ExplicitProfile) {
    if (-not [System.IO.Path]::IsPathRooted($ExplicitProfile)) { throw 'Explicit profile must be absolute.' }
    $profile=[System.IO.Path]::GetFullPath($ExplicitProfile)
  } elseif ($savedProfile) {
    if ($savedProfile -isnot [string] -or -not [System.IO.Path]::IsPathRooted($savedProfile)) { throw 'Saved profile must be absolute and inside the state root.' }
    $profile=[System.IO.Path]::GetFullPath($savedProfile)
    if (-not $profile.StartsWith($rootPath+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Saved profile must remain inside the state root.' }
  } else {
    $legacy=Join-Path $rootPath 'Profile-v3'
    $profile=if(Test-Path -LiteralPath $legacy -PathType Container){$legacy}else{Join-Path $rootPath 'cdp-profile'}
  }
  $port=9335
  if ($null -ne $ExplicitPort) { $port=[int]$ExplicitPort }
  elseif ($null -ne $SavedState -and $SavedState.PSObject.Properties['port'] -and $null -ne $SavedState.port) {
    if ($SavedState.port -isnot [int] -and $SavedState.port -isnot [long]) { throw 'Saved runtime port must be an integer.' }
    $port=[int]$SavedState.port
  }
  if ($port -lt 1024 -or $port -gt 65535) { throw 'Runtime port must be an integer from 1024 to 65535.' }
  return [pscustomobject]@{profilePath=$profile;port=$port}
}
