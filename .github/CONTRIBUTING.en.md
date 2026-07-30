# Contributing guide

Thanks for improving Codex Dream Skin Nahida. This repository is Windows-only
and loads external themes into the official Codex desktop app through
loopback CDP.

## Before you start

1. Read the [project README](../README.en.md), the
   [Windows guide](../windows/README.en.md), and the
   [implementation constraints](../windows/SKILL.md).
2. Search [existing issues](https://github.com/447662/Codex-Dream-Skin-Nahida/issues)
   and [open pull requests](https://github.com/447662/Codex-Dream-Skin-Nahida/pulls).
3. Branch from current `main` and keep each pull request focused on one problem.

## Development and verification

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\run-tests.ps1

powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\installer-static.tests.ps1
```

For injection, CSS, install, launch, or restore changes, also exercise the
affected scripts and `windows/scripts/verify-dream-skin.ps1`. Inspect both the
home and normal task routes.

## Constraints

- Use two-space indentation in PowerShell, JavaScript, JSON, YAML, and CSS.
  Node files use ESM.
- CDP must bind only to loopback.
- Never modify WindowsApps, `app.asar`, official binaries, signatures, API
  keys, or base URLs.
- Read `config.toml` as strict UTF-8, write atomically, and keep a recoverable backup.
- Do not commit logs, build output, local runtime folders, secrets, private
  chats, or unredacted personal screenshots.
- Update `windows/CHANGELOG.md` for user-visible changes. Change
  `windows/VERSION` only for a deliberate release.

Prefer `type(scope): summary` commits, such as
`fix(windows): preserve UTF-8 config on restore`. Report only tests you
actually ran. Visual pull requests need redacted home and task screenshots.
