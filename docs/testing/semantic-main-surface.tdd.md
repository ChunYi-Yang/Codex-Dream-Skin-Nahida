# Semantic Main Surface Compatibility

## User Journey

As a Windows Dream Skin user, I want the Nahida theme to keep loading after a Codex Store update changes generated CSS class names, so that login startup remains functional across supported app builds.

## Evidence

| Guarantee | Test or check | Type | Result |
|---|---|---|---|
| Renderer discovery accepts `main[data-app-shell-main-surface]` while retaining the legacy selector | `node --test windows/tests/injector-bootstrap.test.mjs` | Static regression | PASS |
| The semantic main surface receives the compatibility class required by the existing theme CSS | `node --test windows/tests/renderer-inject.test.mjs` | Renderer unit | PASS |
| Theme cleanup removes the compatibility class and marker | `node --test windows/tests/renderer-inject.test.mjs` | Renderer unit | PASS |
| Portable Node regressions remain green | `node --test windows/tests/*.test.mjs` | Regression | PASS, 13/13 |
| Windows state, startup, payload, restore, and loopback checks remain green | `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/run-tests.ps1` | Integration | PASS |
| Installer startup and uninstall contracts remain green | `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/installer-static.tests.ps1` | Static integration | PASS |
| Codex `26.727.4816.0` loads `nahida-dream` on loopback port `9335` | Live CDP verify and screenshot | Live E2E | PASS |

## Red And Green

- RED: commit `ca386ea` reproduced both failures. The injector rejected the semantic main surface, and the renderer left the theme root inactive without `main.main-surface`.
- GREEN: commit `0d0eb7a` accepted the stable semantic marker, applied a bounded compatibility class, and removed it during cleanup.
- Live GREEN: the replacement watcher injected the current renderer, reported skin version `1.1.75`, and passed structural verification with the Nahida artwork visible.

## Coverage And Gaps

The repository has no JavaScript coverage command. Targeted unit checks, all 13 portable Node tests, the full Windows integration suite, installer contract checks, and a live CDP screenshot cover the changed behavior. The live screenshot is intentionally not committed because it contains task content.
