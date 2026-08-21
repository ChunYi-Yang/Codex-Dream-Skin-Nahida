# Transparent Composer Footer TDD Evidence

## Source

No plan file was provided. The journey was derived from the user's report that a white border/area reappeared around the Codex input after restart.

## User Journey

- As a themed Codex user, I want the task input's surrounding footer layer to be transparent, so the Nahida background remains visible after Codex restarts.

## Task Report

The current Codex task route renders a `bg-gradient-to-t` element as a direct child of the sticky composer footer. The existing theme covered the older semantic composer branch but did not hide this newer sibling. The CSS now hides that gradient only inside the themed thread scroll container; the composer surface itself keeps its themed translucent glass and green accent border.

RED validation:

```text
node --test windows/tests/theme-assets.test.mjs
AssertionError [ERR_ASSERTION]: thread composer footer must not restore Codex's opaque gradient around the input surface
```

GREEN validation:

```text
node --test windows/tests/theme-assets.test.mjs windows/tests/injector-window-readiness.test.mjs windows/tests/renderer-inject.test.mjs
7 tests, 7 pass, 0 fail
```

Live validation also re-injected the current renderer and verified `installed: true` and `pass: true`; a screenshot confirmed the footer gradient was absent while the input surface remained visible.

## Test Specification

| # | What is guaranteed | Test or evidence | Type | Result |
|---|---|---|---|---|
| 1 | The newer sticky thread-footer gradient selector is present and uses `display: none !important`. | `windows/tests/theme-assets.test.mjs` | regression | PASS |
| 2 | Existing theme asset structure, renderer injection, and startup readiness contracts remain green. | `node --test windows/tests/theme-assets.test.mjs windows/tests/injector-window-readiness.test.mjs windows/tests/renderer-inject.test.mjs` | integration/regression | PASS |
| 3 | The running Codex renderer accepts the updated asset and reports successful installation/verification. | loopback CDP injector verification | live integration | PASS |

## Coverage And Known Gaps

This repository does not expose a JavaScript coverage command for the Windows asset regression suite. The focused structural tests and live CDP check cover the changed selector and injection path. A separate automated pixel-diff suite is not configured; visual confirmation was performed from `<local-private-reference>`.

## Merge Evidence

The RED test checkpoint and GREEN fix checkpoint are recorded in the current branch history for this change.
