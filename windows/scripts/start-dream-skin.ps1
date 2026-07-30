[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$RestartExisting,
  [switch]$PromptRestart,
  [string]$ProfilePath,
  [switch]$ForegroundInjector,
  [switch]$AllowDeferredVerify,
  [ValidateRange(0, 10000)]
  [int]$RecoveryDelayMs = 0,
  [ValidateRange(0, 300000)]
  [int]$OperationLockWaitMs = 0
)

$ErrorActionPreference = 'Stop'
$PortExplicit = $PSBoundParameters.ContainsKey('Port')
$Injector = Join-Path $PSScriptRoot 'injector.mjs'
. (Join-Path $PSScriptRoot 'common-windows.ps1')

function Stop-DreamSkinLaunchedSession {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [Parameter(Mandatory = $true)][object]$Node,
    [Parameter(Mandatory = $true)][string]$InjectorPath,
    [Parameter(Mandatory = $true)][int]$SessionPort
  )
  $identity = Get-DreamSkinVerifiedCdpIdentity -Port $SessionPort -Codex $Codex
  if ($null -ne $identity) {
    & $Node.Path $InjectorPath --close-browser --port $SessionPort `
      --browser-id $identity.BrowserId --timeout-ms 10000 *> $null
    if ($LASTEXITCODE -eq 0) {
      $deadline = (Get-Date).AddSeconds(20)
      while ((Get-DreamSkinCodexProcesses -Codex $Codex).Count -gt 0 -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 250
      }
      if ((Get-DreamSkinCodexProcesses -Codex $Codex).Count -eq 0) { return }
    }
  }
  Stop-DreamSkinCodex -Codex $Codex -AllowForce
}

if ($RecoveryDelayMs -gt 0) { Start-Sleep -Milliseconds $RecoveryDelayMs }
$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
if (-not $ForegroundInjector) {
  $managerStart = Get-DreamSkinPreferredManagerStartScript -StateRoot $StateRoot
  if ($managerStart) {
    $managerParameters = @{
      ProfilePath = if ($ProfilePath) {
        [System.IO.Path]::GetFullPath($ProfilePath)
      } else {
        Join-Path $StateRoot 'Profile-v3'
      }
      OperationLockTimeoutMilliseconds = $OperationLockWaitMs
    }
    if ($PortExplicit) { $managerParameters.Port = $Port }
    if ($RestartExisting) { $managerParameters.RestartExisting = $true }
    if ($PromptRestart) { $managerParameters.PromptRestart = $true }
    Write-Host 'CodexDreamSkin is enabled; handing this launch to its active theme runtime.'
    & $managerStart @managerParameters
    if (-not $?) { exit 1 }
    exit 0
  }
}
$operationLock = Enter-DreamSkinOperationLock -WaitMilliseconds $OperationLockWaitMs
try {
  Assert-DreamSkinPort -Port $Port
  if (-not $ProfilePath) { $ProfilePath = Join-Path $StateRoot 'Profile-v3' }
  $ProfilePath = [System.IO.Path]::GetFullPath($ProfilePath)
  $node = Get-DreamSkinNodeRuntime
  $currentCodex = Get-DreamSkinCodexInstall
  $codex = $currentCodex
  $StatePath = Join-Path $StateRoot 'state.json'
  $StdoutPath = Join-Path $StateRoot 'injector.log'
  $StderrPath = Join-Path $StateRoot 'injector-error.log'
  $VerifyPath = Join-Path $StateRoot 'verify.log'
  $VerifyStdoutPath = Join-Path $StateRoot 'verify-start.out.log'
  $VerifyStderrPath = Join-Path $StateRoot 'verify-start.err.log'
  New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null

  $previousState = Read-DreamSkinState -Path $StatePath
  if (-not $PortExplicit -and $null -ne $previousState -and $previousState.port) {
    $savedPort = [int]$previousState.port
    Assert-DreamSkinPort -Port $savedPort
    $Port = $savedPort
  }
  $savedPathCandidate = Get-DreamSkinCodexStatePathCandidate -State $previousState
  $savedCodex = Get-DreamSkinCodexInstallFromState -State $previousState
  $candidateMatchesCurrent = [bool]($null -ne $savedPathCandidate -and
    (Test-DreamSkinPathEqual -Left $savedPathCandidate.PackageRoot -Right $currentCodex.PackageRoot) -and
    (Test-DreamSkinPathEqual -Left $savedPathCandidate.Executable -Right $currentCodex.Executable))
  if ($null -ne $savedPathCandidate -and $null -eq $savedCodex -and -not $candidateMatchesCurrent) {
    $unverifiedSavedRunning = (Get-DreamSkinCodexProcesses -Codex $savedPathCandidate).Count -gt 0
    $unverifiedSavedOwnsPort = Test-DreamSkinCodexPortOwner -Port $Port -Codex $savedPathCandidate
    if ($unverifiedSavedRunning -or $unverifiedSavedOwnsPort) {
      throw 'The saved Codex path is still active but no longer matches a registered OpenAI.Codex package. Close it manually; state was preserved.'
    }
  }

  $currentProcesses = Get-DreamSkinCodexProcesses -Codex $currentCodex
  $codexToStop = $currentCodex
  $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $currentCodex
  $savedIsDifferent = [bool]($null -ne $savedCodex -and
    -not (Test-DreamSkinPathEqual -Left $savedCodex.Executable -Right $currentCodex.Executable))
  if ($savedIsDifferent) {
    $savedProcesses = Get-DreamSkinCodexProcesses -Codex $savedCodex
    $savedOwnsPort = Test-DreamSkinCodexPortOwner -Port $Port -Codex $savedCodex
    if ($currentProcesses.Count -gt 0 -and ($savedProcesses.Count -gt 0 -or $savedOwnsPort)) {
      throw 'Multiple registered Codex package versions are active. Close them manually before starting Dream Skin.'
    }
    if ($savedProcesses.Count -gt 0 -or $savedOwnsPort) {
      if ($savedOwnsPort -and $savedProcesses.Count -eq 0) {
        throw 'The saved Codex listener is active but its process cannot be managed safely; state was preserved.'
      }
      $savedIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $savedCodex
      if ($null -ne $savedIdentity) {
        $codex = $savedCodex
        $codexToStop = $savedCodex
        $cdpIdentity = $savedIdentity
        Write-Warning 'Reapplying Dream Skin to the still-running registered Codex version; the current Store version will be used after that app exits.'
      } else {
        $codexToStop = $savedCodex
        $currentProcesses = $savedProcesses
      }
    }
  }
  $debugReady = $null -ne $cdpIdentity
  $codexProcesses = if (Test-DreamSkinPathEqual -Left $codexToStop.Executable -Right $currentCodex.Executable) {
    $currentProcesses
  } else {
    Get-DreamSkinCodexProcesses -Codex $codexToStop
  }
  $closedExistingCodex = $false
  if (-not $debugReady -and $codexProcesses.Count -gt 0) {
    $restartAuthorized = [bool]$RestartExisting
    if (-not $restartAuthorized -and $PromptRestart) {
      $restartAuthorized = Confirm-DreamSkinRestart -Message 'Codex must restart once to enable Dream Skin. Unsaved input may be lost. Restart now?'
      if (-not $restartAuthorized) {
        Write-Host 'Dream Skin launch was cancelled; Codex was not changed.'
        exit 0
      }
    }
    if (-not $restartAuthorized) {
      throw 'Codex is open without a verified Dream Skin CDP endpoint. Close it first or explicitly use -RestartExisting.'
    }
    Stop-DreamSkinCodex -Codex $codexToStop -AllowForce
    $closedExistingCodex = $true
    $codex = $currentCodex
  }

  $launchedWithCdp = $false
  try {
    if ($null -eq (Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex)) {
      if (-not (Test-DreamSkinPortAvailable -Port $Port)) {
        if ($PortExplicit) { throw "Port $Port is already occupied by an unverified listener. Choose another port." }
        $Port = Select-DreamSkinPort -PreferredPort $Port
      }
      $arguments = @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port")
      if ($ProfilePath) {
        New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
        $arguments += ConvertTo-DreamSkinProcessArgument -Value "--user-data-dir=$ProfilePath"
      }
      Start-Process -FilePath $codex.Executable -ArgumentList $arguments | Out-Null
      $launchedWithCdp = $true
    }

    $deadline = (Get-Date).AddSeconds(45)
    $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex
    while ($null -eq $cdpIdentity) {
      if ((Get-Date) -ge $deadline) {
        throw "Codex did not expose a verified loopback CDP endpoint on port $Port within 45 seconds."
      }
      Start-Sleep -Milliseconds 400
      $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex
    }
  } catch {
    $launchError = $_
    if ($launchedWithCdp) {
      try {
        Stop-DreamSkinLaunchedSession -Codex $codex -Node $node -InjectorPath $Injector -SessionPort $Port
      } catch {
        Write-Warning 'Launch rollback could not fully close the failed CDP session.'
      }
    }
    if (($closedExistingCodex -or $launchedWithCdp) -and
      (Get-DreamSkinCodexProcesses -Codex $codex).Count -eq 0) {
      if ($launchedWithCdp) {
        Write-Warning 'Dream Skin launch failed; reopening Codex without a debugging port.'
      }
      try { Start-Process -FilePath $codex.Executable | Out-Null } catch {
        Write-Warning 'Launch rollback could not reopen Codex automatically.'
      }
    }
    throw $launchError
  }

  try {
    $recordedInjectorStopped = Stop-DreamSkinRecordedInjector -State $previousState
    if (-not $recordedInjectorStopped) {
      $staleStatePath = Archive-DreamSkinStateFile -Path $StatePath
      Write-Warning "Archived stale Dream Skin state at $staleStatePath"
    }
  } catch {
    if ($launchedWithCdp) {
      try {
        Stop-DreamSkinLaunchedSession -Codex $codex -Node $node -InjectorPath $Injector -SessionPort $Port
        Start-Process -FilePath $codex.Executable | Out-Null
      } catch {
        Write-Warning 'State validation rollback could not fully restart Codex; close Codex to ensure its CDP port is closed.'
      }
    }
    throw
  }

  if ($ForegroundInjector) {
    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
    Exit-DreamSkinOperationLock -Mutex $operationLock
    $operationLock = $null
    & $node.Path $Injector --watch --port $Port --browser-id $cdpIdentity.BrowserId
    exit $LASTEXITCODE
  }

  $state = $null
  $daemon = $null
  try {
    $injectorArgs = @((ConvertTo-DreamSkinProcessArgument -Value $Injector), '--watch', '--port', "$Port",
      '--browser-id', $cdpIdentity.BrowserId)
    $daemon = Start-Process -FilePath $node.Path -ArgumentList $injectorArgs -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath
    Start-Sleep -Milliseconds 500
    if ($daemon.HasExited) { throw "The injector exited during startup. See $StderrPath" }

    $injectorStartedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
    if (-not $injectorStartedAt) { throw 'The injector process identity could not be recorded safely.' }
    $state = [pscustomobject]@{
      schemaVersion = 3
      platform = 'windows'
      port = $Port
      injectorPid = $daemon.Id
      injectorStartedAt = $injectorStartedAt
      injectorPath = $Injector
      nodePath = $node.Path
      nodeVersion = $node.Version
      codexExe = $codex.Executable
      codexPackageRoot = $codex.PackageRoot
      codexPackageFullName = $codex.PackageFullName
      codexPackageFamilyName = $codex.PackageFamilyName
      codexVersion = $codex.Version
      browserId = $cdpIdentity.BrowserId
      profilePath = $ProfilePath
      createdAt = (Get-Date).ToUniversalTime().ToString('o')
    }
    Write-DreamSkinState -Path $StatePath -State $state

    $verifyArgs = @((ConvertTo-DreamSkinProcessArgument -Value $Injector), '--verify', '--port', "$Port",
      '--browser-id', $cdpIdentity.BrowserId, '--timeout-ms', '120000')
    $verifyProcess = Start-Process -FilePath $node.Path -ArgumentList $verifyArgs -WindowStyle Hidden `
      -RedirectStandardOutput $VerifyStdoutPath -RedirectStandardError $VerifyStderrPath -PassThru -Wait
    $verifyExitCode = $verifyProcess.ExitCode
    $verifyStdout = if (Test-Path -LiteralPath $VerifyStdoutPath) {
      Read-DreamSkinUtf8File -Path $VerifyStdoutPath
    } else { '' }
    $verifyStderr = if (Test-Path -LiteralPath $VerifyStderrPath) {
      Read-DreamSkinUtf8File -Path $VerifyStderrPath
    } else { '' }
    $verifyOutput = "[stdout]`r`n$verifyStdout`r`n[stderr]`r`n$verifyStderr"
    Write-DreamSkinUtf8FileAtomically -Path $VerifyPath -Content $verifyOutput
    $deferableVerifyFailure = [bool]$AllowDeferredVerify -and
      $verifyOutput -match 'No verified Codex renderer|No page matched the expected Codex shell markers'
    if ($verifyExitCode -ne 0 -and $deferableVerifyFailure) {
      Write-Warning "Dream Skin verification is deferred; the watcher will keep retrying until the Codex main shell appears. See $VerifyPath"
    } elseif ($verifyExitCode -ne 0) {
      throw "Dream Skin verification failed. See $VerifyPath"
    }
  } catch {
    $startupError = $_
    $injectorStopped = $true
    if ($null -ne $state) {
      try {
        $injectorStopped = Stop-DreamSkinRecordedInjector -State $state
      } catch {
        $injectorStopped = $false
        Write-Warning $_.Exception.Message
      }
    } elseif ($null -ne $daemon -and -not $daemon.HasExited) {
      try {
        Stop-Process -InputObject $daemon -Force -ErrorAction Stop
        [void]$daemon.WaitForExit(5000)
        $injectorStopped = $daemon.HasExited
      } catch {
        $injectorStopped = $false
        Write-Warning 'The newly created injector could not be stopped during startup rollback.'
      }
    }
    if ($injectorStopped -and -not $launchedWithCdp) {
      try {
        $rollbackIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex
        if ($null -ne $rollbackIdentity -and $rollbackIdentity.BrowserId -ceq $cdpIdentity.BrowserId) {
          & $node.Path $Injector --remove --port $Port --browser-id $cdpIdentity.BrowserId `
            --timeout-ms 5000 *> $null
          if ($LASTEXITCODE -ne 0) { throw 'Injector removal returned a failure status.' }
        }
      } catch {
        Write-Warning 'Startup rollback could not remove the partially applied live skin; reload or close Codex to clear it.'
      }
    }
    if ($injectorStopped) { Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue }
    if ($launchedWithCdp) {
      try {
        Stop-DreamSkinLaunchedSession -Codex $codex -Node $node -InjectorPath $Injector -SessionPort $Port
        Start-Process -FilePath $codex.Executable | Out-Null
      } catch {
        Write-Warning 'Startup rollback could not fully restart Codex; close Codex to ensure its CDP port is closed.'
      }
    }
    throw $startupError
  }

  Write-Host "Codex Dream Skin is active on verified loopback port $Port."
} finally {
  if ($null -ne $operationLock) { Exit-DreamSkinOperationLock -Mutex $operationLock }
}
