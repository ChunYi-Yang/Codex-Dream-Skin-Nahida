# Repository Guidelines

## Installing through a Codex conversation

When the user asks to install this theme on this computer, read
`docs/install-with-codex.md` and `windows/SKILL.md`, then follow the installation
workflow. Use `windows/setup.ps1 -CheckOnly` for read-only preflight,
`-PrepareOnly` to prepare a validated Node runtime, and the default setup mode
to launch a hidden worker that waits for the user to exit Codex normally.
Never close the current conversation to finish installation. Report the worker
as waiting, not installed; after reopening, inspect
`%LOCALAPPDATA%\CodexDreamSkin\conversation-install.json`, run verification,
and check both home and task routes. Do not infer success from a shortcut or
process existing. Use paths resolved from this checkout; never copy a previous
machine's paths, profiles, credentials, or SSH keys.

## Project Structure

- `windows/` is the product: PowerShell launch/install/restore logic, Node CDP
  injection, assets, installer sources, references, and Windows tests.
- `docs/` contains Windows installation, customization notes, and public
  screenshots used by the root README files.
- `.github/` contains Windows CI, release automation, issue forms, and pull
  request guidance.
- `LICENSE` covers software source. `NOTICE.md` describes artwork and product
  rights that are outside the MIT grant.

## Commands

- `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/run-tests.ps1`:
  run Windows configuration, state, payload, and regression checks.
- `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/installer-static.tests.ps1`:
  validate installer inputs and safety contracts.
- `node --test windows/tests/*.test.mjs`: run portable Node regressions.
- `windows/installer/build-release.ps1`: build the Windows installer after the
  full test suite passes.

Do not bypass failing checks. Document host-only blockers in pull requests.

## Style

Use two-space indentation in PowerShell, JavaScript, JSON, YAML, and CSS. Node
files use ESM. Follow existing kebab-case script names. Prefer platform helpers
already present in `windows/scripts/` over new dependencies. Keep comments
short and focused on safety or non-obvious behavior.

## Testing

Cover changed install, start, inject, verify, pause, theme switch, and restore
behavior. Renderer or CSS changes require live checks on both home and task
routes. Configuration tests must include Chinese or other non-ASCII project
names and prove unrelated TOML survives install/restore. Preserve strict UTF-8,
atomic writes, and recoverable backups for `config.toml`.

## Commits and PRs

Prefer `type(scope): summary`, for example
`fix(windows): preserve UTF-8 config on restore`. Do not add Codex as an author
or co-author. Include actual test results and screenshots for visual changes.
Never commit private chats, API keys, `auth.json`, customer data, or local
runtime state.

## Security and Release

CDP must remain loopback-only. Never modify WindowsApps, `app.asar`, official
binaries, signatures, API keys, or Base URLs. Update `windows/CHANGELOG.md` for
user-visible changes and `windows/VERSION` only for a deliberate release.

## Repository Access

- Canonical GitHub repository: `https://github.com/ChunYi-Yang/Codex-Dream-Skin-Nahida`.
- The `origin` SSH URL is `git@github.com:ChunYi-Yang/Codex-Dream-Skin-Nahida.git`.
- Use the repository's configured `origin` and its locally configured SSH key.
  On another computer, configure that computer's own authorized key only when
  pushing is needed; public source downloads do not require this machine's key.
  Never request, print, or
  commit the private key.
