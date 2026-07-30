# Notices

Codex Dream Skin Nahida is an **unofficial** customization project. It is not
affiliated with, endorsed by, or sponsored by OpenAI or the owners of any
character artwork shown in this repository.

## Software license

The MIT License in `LICENSE` applies to the software source code in this
repository, including scripts, CSS, injectors, tests, and software
documentation.

It does not grant rights to:

- OpenAI or Codex trademarks, product names, logos, application binaries,
  `app.asar`, WindowsApps packages, or trade dress;
- the Nahida character, Genshin Impact, or related names and artwork;
- user-supplied images, third-party artwork, screenshots, logos, or other
  assets that carry their own rights.

The `windows/assets/nahida-*` files and Nahida screenshots under
`docs/images/` are theme demonstrations and are not licensed under MIT.
Before public, commercial, or downstream redistribution, independently verify
the required copyright, character, trademark, and platform permissions.

## Bundled runtime

The Windows release builder downloads a pinned official Node.js archive,
checks its SHA-256 digest, and includes the matching Node.js license in the
installer payload. Node.js remains subject to its own license.

## Security model

Themes are applied through Chromium DevTools Protocol on loopback only. While
a themed session is running, treat the local debugging port as sensitive and
do not run untrusted local software that could attach to it. Use Restore to
close the themed session and return Codex to its official appearance.
