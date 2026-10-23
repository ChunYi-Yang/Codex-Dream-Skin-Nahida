# Semantic Settings Surface Compatibility

## Source And User Journey

No separate plan file was used. The journeys were derived from the reported
Codex `26.727.4816.0` settings regression:

- As a Windows Dream Skin user, I want every current settings route to receive
  the Nahida glass surface even when Codex changes its generated container
  classes.
- As a user who keeps Codex open while developing the local theme, I want a
  same-version CSS update to replace the injected style immediately after the
  watcher restarts.
- As a settings user, I want the obsolete header, draggable toolbar, and 46 px
  content offset removed without changing the normal task route header.

## Task Report

### Settings surface discovery

- RED checkpoint: `bd3530a` added a renderer fixture where settings use
  `main.main-surface [class~="p-panel"]` instead of the legacy
  `div.main-surface`. `node --test windows/tests/renderer-inject.test.mjs`
  failed because the semantic settings panel did not receive
  `dream-settings-surface` and its shell did not receive
  `dream-settings-shell`.
- GREEN checkpoint: `7088f58` extended the bounded settings selector while
  preserving the legacy path. The same renderer test passed.

### Settings header and frame cleanup

- RED checkpoints: `80bcfb9` and `994f0be` added CSS assertions for the current
  direct header, semantic `px-panel draggable` toolbar, and the new
  `_MainContentFrame` wrapper. `node --test windows/tests/theme-assets.test.mjs`
  failed until those current structures were covered.
- GREEN result: the final CSS hides both blank bars and sets the semantic frame
  to `margin-top: 0` and `height: 100%`, while the non-settings task header rule
  remains unchanged.

### Same-version style refresh

- RED checkpoint: `1bad21a` supplied an existing style element with the same
  version and stale CSS. `node --test windows/tests/renderer-inject.test.mjs`
  failed because version-only invalidation retained the old text.
- GREEN result: the renderer now replaces the style when either the version or
  CSS text differs.

## Test Specification

| # | What is guaranteed | Test or command | Type | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Legacy and current semantic settings containers receive the settings surface marker | `windows/tests/renderer-inject.test.mjs` | Renderer unit | PASS | `node --test windows/tests/*.test.mjs` |
| 2 | Cleanup removes the settings surface and shell markers | `windows/tests/renderer-inject.test.mjs` | Renderer unit | PASS | Portable Node suite, 13/13 |
| 3 | Same-version stale CSS is replaced when its text changes | `windows/tests/renderer-inject.test.mjs` | Renderer unit | PASS | Portable Node suite, 13/13 |
| 4 | Current settings header and draggable toolbar are hidden | `windows/tests/theme-assets.test.mjs` | CSS regression | PASS | Portable Node suite, 13/13 |
| 5 | Current settings frame has zero top margin and fills the available height | `windows/tests/theme-assets.test.mjs` | CSS regression | PASS | Portable Node suite, 13/13 |
| 6 | Windows config, state, startup, payload, restore, and loopback contracts remain valid | `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/run-tests.ps1` | Integration | PASS | Final run on 2026-08-01 |
| 7 | Installer startup and uninstall contracts remain valid | `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/installer-static.tests.ps1` | Static integration | PASS | Final run on 2026-08-01 |
| 8 | Login launcher selects local Nahida, delayed retries, deferred verification, and `Profile-v3` | `node windows/scripts/launch-dream-skin-at-login.mjs --self-test` | Startup self-test | PASS | `"pass": true`, `"localTheme": true`, `"deferredVerify": true` |
| 9 | The restarted watcher injects the exact final CSS into the live settings route | Loopback CDP inspection on port `9335` | Live E2E | PASS | `styleMatches: true`, skin version `1.1.75` |
| 10 | The live settings surface starts below only the native 36 px application menu and has no blank bars | Loopback CDP layout inspection | Live E2E | PASS | settings `x=263.67`, `y=36.67`, `1124.33 x 802.67`; header and toolbar `display:none`; frame `margin-top:0` |

## Live Evidence

- Watcher restarted from PID `17672` to PID `39112`; the state file was updated
  to the new PID and loopback port `9335` remained reachable.
- The Windows Startup folder contains `Codex Dream Skin Auto Start.lnk`, which
  targets `C:\devtools\nodejs\node-v22.13.1-win-x64\node.exe` with
  `D:\codex_theme\windows\scripts\launch-dream-skin-at-login.mjs`.
- Final screenshot:
  stored locally as `settings-header-final-after-watcher-restart.png`; the
  personal profile path and private session identifier are omitted.
- Live viewport overflow was false on both axes.

## Coverage And Known Gaps

The repository does not define a JavaScript coverage command, so no percentage
can be reported. Coverage for this regression is provided by targeted renderer
and CSS assertions, all 13 portable Node tests, the full Windows integration
suite, installer static checks, the login-launcher self-test, and live CDP
inspection of the real Codex settings route. The screenshot is intentionally
kept outside Git because it can contain local application state.

## Merge Evidence

- RED: `bd3530a`, `80bcfb9`, `1bad21a`, and `994f0be` preserve the regression
  tests on the current branch.
- GREEN: `7088f58` contains the semantic settings discovery fix; the final CSS
  and style-refresh production changes are committed after all final checks
  above pass.
