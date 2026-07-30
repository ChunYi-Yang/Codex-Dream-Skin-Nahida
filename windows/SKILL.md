---
name: codex-dream-skin
description: Apply, launch, verify, repair, update, or restore a full decorative skin for the Windows Codex desktop app. Use when the user asks for a Codex theme that goes beyond official color settings, wants a layered multi-image interface, needs the skin reapplied after a Codex update, or needs a safe rollback without modifying WindowsApps or app.asar.
---

# Codex Dream Skin

Apply a reversible renderer skin through Chromium DevTools Protocol while launching the official Store-installed Codex executable. Never replace or take ownership of files under `WindowsApps`.

## Workflow

1. Install Node.js 22 or newer, close Codex, then run `scripts/install-dream-skin.ps1` once to set the matching official base colors and create launch, login-autostart, and restore shortcuts.
2. Run `scripts/start-dream-skin.ps1`. The shortcut asks before restarting an already-open Codex app; CLI callers must explicitly add `-RestartExisting`.
3. Run `scripts/verify-dream-skin.ps1 -ScreenshotPath <absolute-path>` after launch. Treat a missing hero, native composer, sidebar skin, or injection marker as failure. The native suggestion count is responsive and may be two to four.
4. Inspect the screenshot against `references/qa-inventory.md`. Verify both the home screen and a normal task before signing off.
5. Run `scripts/restore-dream-skin.ps1` to remove the live skin, close the saved CDP session, and reopen Codex normally. Add `-RestoreBaseTheme` to restore only saved appearance keys, `-RecoverConfigBackup` for explicit byte-for-byte recovery of a damaged config, or `-Uninstall` to delete shortcuts. A completed config restore archives that install's backup so a later install captures a fresh baseline.

## Guardrails

- Preserve the official executable, package signature, user threads, pets, plugins, and authentication state.
- Do not use any theme image as a fake whole-window overlay. Hero, sidebar, portrait, decoration atlas, and scene are decorative layers; all controls remain live Codex controls.
- Keep the transparent decoration atlas confined to icon and ornament crops. Suggestion labels and actions remain native even when their icon wells use atlas tiles.
- Attach the "选择项目" treatment to Codex's real project-selector toolbar and keep the current project button clickable; never draw a disconnected replacement.
- Keep decorative layers `pointer-events: none` and keep real buttons, navigation, and composer above them.
- On app updates, rerun install and launch; the scripts discover the current Appx package dynamically. Saved paths are never trusted for process control unless they still match a registered package identity.
- The default launcher scans for a free port when `9335` is occupied. An explicitly requested occupied port fails closed.
- Keep the injection daemon running for navigation/reload resilience. Its state and logs live under `%LOCALAPPDATA%\CodexDreamSkin`.
- CDP targets must use a same-port loopback WebSocket, belong to the current Store package, retain the launch-time Browser ID, and expose expected Codex renderer markers. If Codex rebuilds Chromium with a new Browser ID, the old watcher may only observe the new loopback endpoint shape and delegate to `start-dream-skin.ps1` for full package, owner, and renderer revalidation; it must never inject by reconnecting directly.
- Loopback prevents LAN exposure, but Chromium CDP has no same-user authentication. Run only trusted local software while the skin is active, and use restore to close the debug session when it is no longer needed.
- Preserve `config.toml` as strict UTF-8. Never use encoding-dependent whole-file PowerShell reads/writes, silently transcode UTF-16, or overwrite a file that changed after it was read. Ambiguous TOML shapes must fail before writing rather than receive a best-effort rewrite.
- Keep every theme filename inside `assets/`, reject symlink escapes, cap each image at 16 MB and the unique image set at 32 MB total.
- Keep install/start/restore/verify serialized with the per-user operation lock in `common-windows.ps1`.

## Checks

```powershell
powershell -NoProfile -File tests\run-tests.ps1
node --check scripts\injector.mjs
node --check assets\renderer-inject.js
```

## Resources

- `scripts/injector.mjs`: CDP connection, renderer injection, verification, screenshot, and removal.
- `scripts/common-windows.ps1`: Store-package discovery, Node validation, port ownership, state, and process identity safety.
- `scripts/launch-dream-skin.mjs`: bounded shortcut entry point hosted by code-signed Node.js.
- `scripts/launch-dream-skin-at-login.mjs`: delayed silent login entry point with bounded operation-lock retries.
- `scripts/config-utf8.ps1`: atomic UTF-8 configuration backup, selective restore, and explicit recovery.
- `assets/dream-skin.css`: full visual layer.
- `assets/renderer-inject.js`: idempotent DOM integration and cleanup.
- `assets/theme.json`: bounded multi-image theme manifest with single-image fallback.
- `assets/nahida-*`: bundled hero, sidebar, portrait, transparent decoration atlas, and empty-scene assets.
- `references/qa-inventory.md`: required functional and visual signoff coverage.
- `references/runtime-notes.md`: troubleshooting and update behavior.
- `tests/run-tests.ps1`: configuration, state, recovery, payload, theme-asset, and CDP validation regression checks.
