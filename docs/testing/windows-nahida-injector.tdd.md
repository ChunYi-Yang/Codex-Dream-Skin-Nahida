# Windows Nahida Injector TDD Evidence

## Scope

The test journeys were derived during the Windows-only repository cleanup. No
external plan file was used.

- A Windows user can start, verify, and remove the Nahida theme without a CDP
  operation crossing into a different browser identity.
- Theme text containing JavaScript replacement tokens such as `$&` and a
  dollar-backtick sequence
  reaches the renderer unchanged.
- CI and the Windows aggregate script execute every portable Node regression.

## RED

Command:

```powershell
node --test windows/tests/injector-bootstrap.test.mjs `
  windows/tests/injector-window-readiness.test.mjs `
  windows/tests/payload-template-integrity.test.mjs
```

Result: 1 passed, 2 failed because `injector.mjs` did not export
`verifySession` or `loadPayload`. The first complete-suite run also exposed an
out-of-scope `options.browserId` reference in one-shot discovery.

## GREEN

| Guarantee | Test | Result |
|---|---|---|
| Watch injection remains pinned to the validated Browser ID | `injector-bootstrap.test.mjs` | PASS |
| Verify accepts current task/home layouts and rejects missing native anchors | `injector-window-readiness.test.mjs` | PASS |
| Theme strings containing replacement tokens do not corrupt the payload | `payload-template-integrity.test.mjs` | PASS |
| Verify, once, and remove pass Browser ID explicitly | `injector-one-shot.test.mjs` | PASS |
| All portable Windows Node regressions run together | `node --test windows/tests/*.test.mjs` | 13/13 PASS |
| Windows aggregate regression script includes all Node tests | `windows/tests/run-tests.ps1` | PASS |

## Gaps

This host has Windows PowerShell 5.1 and Node.js 22, but not PowerShell 7 or
Inno Setup. GitHub Actions covers PowerShell 7 and installer compilation. The
repository has no coverage instrumentation, so a line/branch coverage value is
not available. This verification used the supplied real screenshots but did
not start or modify the user's live Codex session.
