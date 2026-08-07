# Codex Update Recovery TDD Evidence

## Source Plan

Journeys were derived during this TDD run from the reported Windows update and boot failures.

## User Journeys

- As a Windows user, I want Codex updates to recover the Nahida theme after the old CDP browser closes, so the updated app does not reopen in the official appearance.
- As a Windows user, I want a stale watcher PID to be replaced safely, so a reused Windows process is never terminated as if it were the theme watcher.
- As a Windows user, I want the home composer utility bar and input surface to share the green glass treatment, so the new semantic composer does not show native white layers.

## Test Specification

| # | Guarantee | Test | Result |
|---|---|---|---|
| 1 | Reused or non-inspectable injector PIDs are treated as stale state and skipped without termination. | `windows/tests/injector-state-recovery.tests.ps1` | PASS |
| 2 | Browser identity recovery waits 180 seconds, distinguishes a still-running Codex process, and delegates verified startup when no replacement endpoint appears. | `node --test windows/tests/injector-bootstrap.test.mjs` | PASS |
| 3 | Semantic home composer discovery and placement remain valid on the current Codex DOM. | `node --test windows/tests/renderer-inject.test.mjs windows/tests/injector-window-readiness.test.mjs` | PASS |
| 4 | Home composer outer glass, inner layout transparency, and utility bar green glass rules are present. | `node --test windows/tests/theme-assets.test.mjs` | PASS |

## RED/GREEN Evidence

- RED: `injector-state-recovery.tests.ps1` failed because `common-windows.ps1` threw when the saved PID belonged to an uninspectable process.
- GREEN: the same test passed after the function returned `$false` with a stale-PID warning.
- RED: `injector-bootstrap.test.mjs` failed because recovery was limited to 45 seconds and had no still-running-Codex fallback.
- GREEN: the same test passed after the 180-second wait and verified recovery fallback were added.

## Runtime Evidence

- Recovered Codex `26.803.5235.0` on loopback port `9335` with a new Browser ID and a verified watcher.
- The startup state was rewritten with the current package identity instead of the reused PID from the previous package.

## Known Gaps

- A full Windows Store update cannot be simulated deterministically in the repository test process; runtime evidence was collected against the installed updated Codex build.
