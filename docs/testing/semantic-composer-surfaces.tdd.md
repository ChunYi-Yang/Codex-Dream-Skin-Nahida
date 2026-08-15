# Semantic Composer Surfaces TDD Evidence

## Source

Journeys and acceptance criteria were derived from the reported Windows task-route screenshots on 2026-08-16.

## User Journeys

- As a themed Codex user, I want the task composer footer to stay transparent so the background art is not covered by a white gradient after input.
- As a themed Codex user, I want queued follow-up rows to use the same green glass as the composer instead of an opaque white surface.
- As a themed Codex user, I want the active stop/send action to use the Nahida accent instead of the native black button.

## Test Specification

| # | Guarantee | Test or evidence | Type | Result |
|---|---|---|---|---|
| 1 | A semantic thread composer hides its direct `bg-gradient-to-t` footer sibling. | `node --test windows/tests/theme-assets.test.mjs` | regression | PASS |
| 2 | Queued message surfaces have an explicit green glass `background-color` and themed border. | `node --test windows/tests/theme-assets.test.mjs` | regression | PASS |
| 3 | `bg-primary-solid` composer actions use the Nahida accent with white content. | `node --test windows/tests/theme-assets.test.mjs` | regression | PASS |
| 4 | The live task footer gradient computes to `display: none`; the stop action computes to `rgb(114, 184, 61)` with white text and SVG. | loopback CDP inspection on port `9335` | live integration | PASS |

## RED/GREEN Evidence

- RED `e3822fd`: the semantic thread gradient selector was absent.
- RED `d397240`: the queued row relied on a background shorthand instead of an explicit computed color.
- RED `d39e23c`: the current `bg-primary-solid` action had no themed selector and rendered black.
- GREEN: the same asset test passed after the scoped CSS rules were added.

## Visual Evidence

- Task-route capture: `%TEMP%\codex-dream-skin-composer-action-green.png`.
- The task background remains continuous behind the composer, and the active action is green with white content.

## Coverage And Known Gaps

- The shared semantic composer selector covers home and task placement, while the footer gradient rule is intentionally restricted to `data-composer-placement="thread"`.
- A separate background CDP target could not load Electron's `app://-/index.html` protocol (`net::ERR_ABORTED`), so the active task was not displaced for a second live home capture. Existing home DOM and CSS regressions remain green.
