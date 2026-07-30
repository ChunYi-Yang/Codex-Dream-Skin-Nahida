# Home Hero Single-Surface Regression

## User Journey

As a Windows theme user, I want the home hero to render as one correctly sized banner so that nested duplicate artwork does not obscure the home screen.

## Evidence

| Guarantee | Test or check | Type | Result |
|---|---|---|---|
| Hero artwork targets only the injected hero surface | `node --test windows/tests/theme-assets.test.mjs` | Static regression | PASS |
| Legacy layout reset excludes an element already marked as the hero | `node --test windows/tests/theme-assets.test.mjs` | Static regression | PASS |
| Home renders one `950 x 252` hero with one painted surface | Loopback CDP inspection and screenshot | Live E2E | PASS |
| Task route has no home or hero markers and no viewport overflow | Loopback CDP inspection and screenshot | Live E2E | PASS |

## Red And Green

- RED: the first regression matched the legacy three-level `first-child` hero selectors still present in the stylesheet.
- GREEN: removing those legacy artwork selectors left only `.dream-home-hero-surface` as the painted hero.
- RED: the second regression found that the legacy layout reset could still force a marked hero to `height: auto`.
- GREEN: excluding `.dream-home-hero-surface` from that reset restored the intended 252 px height.

## Coverage And Gaps

The repository does not expose a JavaScript coverage command for CSS structure. The static theme regression, full Windows test suite, and live home/task route checks cover the changed behavior.
