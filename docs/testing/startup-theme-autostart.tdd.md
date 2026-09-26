# Windows startup and theme apply TDD evidence

Date: 2026-09-22

## User journeys

- A user who enables sign-in startup gets Codex opened with the active Dream Skin theme.
- A user can open or apply the bundled `nahida-dream` theme without a preset-ID error.
- Installer, script install, and tray startup controls use the same compatible login launcher.

## RED evidence

- `node --test windows/tests/startup-theme-contract.test.mjs`
  failed because `Initialize-DreamSkinThemeStore` required the bundled ID to start with `preset-`.
- Existing `%LOCALAPPDATA%\CodexDreamSkin\autostart.log` recorded exit code 1 because the login launcher passed the removed `-UseLocalTheme` parameter.
- Existing launcher diagnostics recorded `Bundled theme id must be a safe preset id: nahida-dream`.

## GREEN evidence

| Guarantee | Validation | Result |
|---|---|---|
| Safe bundled IDs such as `nahida-dream` initialize successfully | `node --test windows/tests/startup-theme-contract.test.mjs` | PASS |
| Login startup uses only parameters supported by the current start script | `node --test windows/tests/local-nahida-handoff.test.mjs` | PASS |
| Installer, runtime repair, localization, and startup payloads contain both Node launchers | `node --test windows/tests/localization-contract.test.mjs` | PASS |
| Inno startup calls the Node login launcher instead of tray-only PowerShell | `powershell.exe -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/installer-static.tests.ps1` | PASS |
| Login launcher is syntactically valid and reports the current contract | `node windows/scripts/launch-dream-skin-at-login.mjs --self-test` | PASS |
| Current renderer payload builds with the active `nahida-dream` theme | `node windows/scripts/injector.mjs --check-payload` | PASS |

## Live state

- Rebuilt `%LOCALAPPDATA%\CodexDreamSkin\active-theme\theme.json` with ID `nahida-dream`.
- Refreshed `Codex Dream Skin Auto Start.lnk` to call the current repository login launcher through Node on port 9335.
- The existing `paused` marker is still present. Removing it is required before the live injector can resume; it was intentionally left untouched pending the repository-required deletion confirmation.

## Known unrelated failures

The full `node --test windows/tests/*.test.mjs` run still contains pre-existing failures in renderer template expectations and a missing `tools/renderer-runtime.test.mjs` module. The startup, theme-ID, installer, localization, and payload checks listed above pass independently.
