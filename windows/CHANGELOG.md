# Windows Changelog

## 1.1.75 - 2026-07-30

- Prevented the home hero artwork and overlay from being applied to both a legacy DOM path and the injected hero surface, removing the nested duplicate banner on current Codex builds.

- Made the local layered Nahida theme the explicit Windows sign-in default even when CodexDreamSkin has another saved theme selected. The manager tray now exposes a validated “本地纳西妲 · 梦境林庭” entry and reports the actual local injector instead of the last saved-theme name.
- Added coexistence with the locally installed CodexDreamSkin theme manager. When that manager is installed and unpaused, the desktop and login launchers hand control to its verified runtime before taking the shared operation lock; pausing the manager leaves Nahida as the normal launch target.
- Updated the CodexDreamSkin tray's background and saved-theme switch actions to start its own runtime after changing the active theme, which safely stops the recorded Nahida watcher instead of leaving two injectors competing for the renderer.

- Migrated normal, login, default, and browser-recovery launches to retained clean `Profile-v3` after Chromium marked `Profile-v2` as crashed; older profiles remain untouched.
- Browser-rebuild recovery now waits up to 180 seconds for an in-flight startup lock and carries explicit restart authorization, preventing the recovery worker from losing its race with initial verification and leaving the official theme active.
- Failed startup rollback now prefers a verified CDP `Browser.close` and bounded clean-exit wait before force termination, reducing repeated Chromium profile crash recovery.

## Unreleased

### Repository

- Focused the repository, CI, release workflow, documentation, and installer inputs on the supported Windows product; removed the retired macOS build dependency and moved software licensing to the repository root.
- Added real Nahida home, task, and settings screenshots to the rewritten Chinese and English project READMEs.
- Restored the explicit signed-Node validation required by the installer safety suite.

### Runtime recovery

- Restored renderer discovery after Codex replaced the legacy `main.main-surface` class with the stable `data-app-shell-main-surface` marker, while cleaning up the compatibility class whenever Dream Skin is removed.
- Login startup now uses deferred renderer verification: if Windows opens only Codex's early avatar/loading windows during boot, Dream Skin keeps the watcher and state alive so the theme can apply when the main shell finally mounts instead of rolling back to the official theme.
- Migrated every launch and browser-recovery path to a clean `Profile-v2` after repeated timeout rollback left the original Chromium profile in a crash-recovery loop; the replacement reached the verified shell in 37.8 seconds instead of roughly 140 seconds, while the old profile remains untouched.
- Raised first-renderer verification to 120 seconds for slower boot-time Store initialization without relaxing package, loopback, Browser ID, protocol, or DOM marker validation.
- Extended first-renderer verification to 90 seconds for Codex `26.715.4045.0`, whose native shell can mount after the previous 30-second limit, and shortened the login pre-delay to 5 seconds so automatic launch begins promptly without weakening CDP checks.
- Preserved complete renderer-verification diagnostics in dedicated files and limited failed target reports to structural DOM markers plus target protocols, making Store-update selector changes diagnosable without logging task text.
- Added a code-signed Node login launcher and Startup shortcut that waits for the Windows desktop, starts Dream Skin with its dedicated profile, and retries only bounded operation-lock collisions without changing the normal desktop launch path or showing startup dialogs.
- Redirected the signed Node launcher's PowerShell output to bounded runtime log files instead of synchronous pipes, preventing a successfully started background injector from keeping the normal desktop launcher alive indefinitely.
- Allowed startup verification to pass on the Scheduled and Plugins routes by checking their stable search IDs, so reopening Codex on a non-chat page no longer causes a false theme failure.
- Added bounded automatic recovery when Codex rebuilds its Chromium browser and changes the CDP Browser ID. The old watcher never injects into the replacement endpoint directly; it delegates to the existing start script so Store package identity, loopback port ownership, and renderer markers are revalidated before a new watcher is recorded.
- Kept normal app closure distinct from an internal browser rebuild: if no replacement endpoint appears within 45 seconds, the watcher exits without reopening Codex. Recovery diagnostics are isolated in `%LOCALAPPDATA%\CodexDreamSkin\browser-recovery.log`.

### Nahida theme

- Reduced the writing-block prompt-card glass opacity from 30% to 15% after live review, keeping the copyable prompt card themed but much more transparent.
- Reduced the writing-block prompt-card glass opacity from 42% to 30% so copyable prompt cards read lighter while normal assistant output remains transparent.
- Retinted Codex writing-block prompt cards (`data-oai-writing-block-surface` copy blocks) with the leaf-green glass treatment while leaving normal assistant output, markdown text, user bubbles, and the conversation column transparent.
- Removed the remaining leaf-green glass from assistant output content, leaving the assistant turn, markdown container, and markdown text/list/table/quote elements transparent while preserving green glass on non-output controls.
- Moved the assistant glass background one level deeper from the markdown container to its direct text/list/table/quote children, so blank space beside generated text stays transparent instead of becoming a full-width panel.
- Restored the assistant output boundary so `data-content-search-unit-key$=":assistant"` stays transparent while only the inner markdown/text surfaces receive the leaf-green glass treatment.
- Moved the assistant output glass treatment from the markdown child to the full `data-content-search-unit-key$=":assistant"` output block, so the generated answer panel is themed while the composer, user bubbles, and conversation column stay untouched.
- Scoped the visible leaf-green conversation treatment to assistant markdown output blocks only, restoring the surrounding conversation column to transparent and returning user bubbles to a subtle neutral tint.
- Darkened the conversation surface and composer add-panel from near-white translucency to visible leaf-green glass, and targeted the real `data-composer-overlay-floating-ui` attachment popover used by the current Codex build.
- Forced conversation thread token variables and virtualized message cards to the same 15% translucent leaf-green surface so assistant output cards no longer fall back to the global near-white main-panel color.
- Recolored the assistant output's large markdown panel and add/plugin selection popovers to the translucent leaf-green glass treatment, removing the remaining opaque white container surfaces.
- Broadened conversation-thread surface overrides to cover token, arbitrary, and white background utility classes so inline task cards match the translucent green code/reference treatment.
- Matched inline task/reference cards in conversation threads to the translucent code-block treatment, removing the remaining opaque white card background.
- Reduced the Pull Request route's full-page surface to 5% translucent green and removed the large blur layer so it reads as transparent as the scheduled/plugins pages.
- Matched the Pull Request route to the scheduled/plugins page treatment by marking it as a themed route and replacing opaque main surfaces with translucent leaf-green glass.
- Let the selected-project chip use automatic height and normal line-height so English project names are no longer vertically clipped.
- Blocked home-banner mode on plugin and scheduled detail pages by treating their active sidebar navigation as real page content, so the large home hero no longer covers plugin details.
- Separated the compact home project selector from the composer with a real outer gap, so the selector row no longer sits flush against the input surface.
- Gave the compact home project selector symmetric top and bottom breathing room, keeping the selected-project chip on the same row without touching the lower edge.
- Changed the home project selector into a compact inline label-plus-project row so the selected project sits to the upper right of the label and the selector no longer needs a full-width band.
- Raised the home project selector above the composer surface and added a small safety gap so the selected-project chip is no longer clipped by the input box.
- Moved the home hero copy farther left and collapsed the visible blank band between the project selector and composer while keeping the selected-project chip above the input.
- Shifted the home hero copy to the left side of the banner and separated the selected-project row from the composer glass so the input box no longer covers the project selector.
- Hardened the home-route detector for Codex re-renders that briefly mount then remove the native `home-icon`: visible task, settings, and search surfaces now block home mode first, while native game-source and composer-only start surfaces still keep the hero and composer in a single non-scrolling viewport.
- Restored the July 23 home composition on newer Codex builds that no longer expose the legacy `home-icon` marker: empty start surfaces receive the themed hero fallback, while task pages remain excluded by their conversation marker. Corrected the escaped native home-suggestion selector so the fallback also renders on the current empty-start DOM.
- Restored the sidebar brand override on newer Codex builds where the visible `Codex` label moved out of the old mode-switch button; it now falls back to the first branded sidebar heading and keeps the green text treatment.
- Treated headerless new-task surfaces as home even when Codex leaves an offscreen stale conversation node behind, and widened the fallback hero so the empty start page matches the July 23 composition.
- Required task and scheduled/plugin markers to be visible before they can block the home fallback, fixing blank new-task surfaces that retained hidden header/search DOM.
- Relaxed startup verification to validate only visible home hero/suggestion surfaces; hidden offscreen home DOM no longer causes a successful injection to be rolled back to the official theme.
- Prevented visible task conversations from being mistaken for the empty home route, added a stable `.dream-home-hero-surface` marker for the native home banner, and removed the extra home composer decoration/project-frame chrome so the selected-project row keeps the compact input layout.
- Made the home route fit in a single viewport by hiding native suggestion cards, collapsing the empty home banner spacer, removing the home scrollbar, and keeping the hero plus composer visible without scrolling.
- Removed the opaque sticky search bands and fade masks around the Scheduled and Plugins page searches, matching their input surfaces to the keyboard-shortcuts settings search.
- Restored the floating thread summary to the translucent green glass treatment after Codex added a nested opaque dropdown surface; the override is scoped to `thread-summary-panel-*` slots and leaves unrelated dialogs unchanged.
- Added a five-layer Nahida dream-garden asset pack with dedicated hero, sidebar, portrait, transparent decoration atlas, and scene artwork.
- Updated the renderer palette and native Codex control styling to use cream, leaf green, teal, and gold while keeping controls interactive.
- Fixed the nested settings surface so the Nahida artwork remains visible, restored the output collapse indicator, and refined project popovers and the composer transparency.
- Replaced the white composer surround and settings cards with a shared 50% translucent leaf-green glass surface.
- Made the project header 50% translucent and added an accessible close control to the floating thread summary panel.
- Reduced the composer itself to 50% opacity and removed the extra sticky footer backdrop around it.
- Fixed the summary close button so it hides only the floating summary and no longer opens Codex's full task sidebar; added a separate restore control.
- Matched the header, summary panel, and composer to the settings glass border treatment, and removed the native white composer fade mask and dock padding.
- Expanded thread content into the space released when the summary panel is hidden, while cancelling Codex's retained horizontal rail offset.
- Replaced the native white file-change card surface and hairline with the shared leaf-green glass treatment.
- Lifted the composer 12px above the window edge and reinforced its translucent green inset border.
- Kept the expanded conversation width while sizing the composer to about 40% of the work area, bounded between 520px and 760px.
- Removed the remaining white fade behind the live file-change summary and matched its capsule to the green glass theme.
- Replaced the home hero artwork with `纳西妲/386062b8f1876a27a8168a2bab751456_4170308972841738428.jpg` while preserving the existing banner layout and text treatment.
- Made every home hero prompt display the project alias `虚空` without changing project names or selection behavior elsewhere.
- Added a dedicated illustrated background for the native right-side task panel while leaving the left project navigation unchanged.
- Reduced the project header to about 40% of the main workspace, centred it, and cancelled Codex's duplicated inline left offset.
- Removed the empty project header from the home route while retaining the compact header on task routes.
- Removed the empty project header and top divider from the home and settings routes, preserving transparent top clearance only on home while collapsing it in settings and retaining the task header.
- Moved the illustrated right-panel artwork onto the panel root and cleared the stacked native surface masks that had made it appear blank.
- Restyled the four right-panel tool buttons as separate settings-style green glass capsules.
- Aligned the illustrated right panel with the thread content frame so it no longer protrudes into the project-header row.
- Removed the custom summary close/reopen controls and hidden-panel reflow overrides so Codex's native sidebar controls own that workflow again.
- Restored Codex's default composer width while retaining the themed glass surface and bottom clearance.
- Added a reusable Windows image/color replacement guide and reduced the retained source bundle to the assets required to reproduce the current theme.
- Added a configurable `appLabel` and changed only the visible sidebar brand from `Codex` to `虚空终端`, with cleanup restoring the official text.
- Aligned the file-diff review panel with the task content frame, reused the illustrated right-panel background beneath readable green glass surfaces, and made the main shell non-scrollable so opening a changed file cannot shift the composer and panel upward.
- The native file explorer and terminal tabs now reuse the illustrated right-panel background with themed green glass search, tree, toolbar, and terminal surfaces while preserving file and ANSI terminal behavior.
- Removed the file tree's remaining Shadow DOM white canvas, themed its path toolbar, and set both the file tree and terminal glass layers to 15% opacity so the shared right-panel artwork remains visible.
- Matched the review body, diff renderer, and review file tree to the same 15% glass treatment while retaining stronger toolbar and filter surfaces for readability.
- Made the canonical desktop `Codex` shortcut launch Dream Skin across Windows restarts, with an exact backup restored by the official-appearance workflow.
- Extended recorded-injector shutdown verification to a 15-second polling window so delayed Windows process cleanup no longer aborts a valid desktop launch after five seconds.
- Defaulted Windows Dream Skin launches to a dedicated local user-data directory because current Chromium builds ignore remote-debugging flags on the default profile and otherwise roll back to the official theme.
- Matched the appearance diff preview, Git instruction editors, shortcut search toolbar, voice dictionary field, and personalization editor to the review panel's three-level green glass treatment, including the diff preview's Shadow DOM canvas.
- Allowed live injector verification to succeed on the themed settings route, where Codex legitimately omits the task composer.
- Removed the shortcut search area's upper and lower toolbar bands while retaining the themed search field.
- Replaced PowerShell-targeting desktop and Start Menu links with a bounded script hosted by code-signed OpenJS Node.js, avoiding both `LNK.Agent` heuristic quarantine and Smart App Control rejection of an unsigned custom executable.
- Persisted bounded launcher diagnostics under `%LOCALAPPDATA%\CodexDreamSkin\launcher.log` so post-restart failures retain their exit code and script error without recording task content.

### 新增

- 默认替换为“森息工坊”多图主题：去水印主背景、侧栏、人物装饰、透明元素图集和空任务场景。
- 新增 `assets/theme.json`，可配置主图及 `sidebar`、`portrait`、`decorations`、`scene`；资源均限制在主题目录内并校验格式与 16 MB 上限。
- 草元素徽记、晶蝶和四个抠图角色合并为一张透明图集，首页建议卡和装饰层通过图集定位复用。

### 改进

- 移除写死的人名、粉紫文案和丝带装饰，统一使用森林绿、青绿、嫩绿与暖橙 token，并覆盖任务页、输入区、弹层、代码块、滚动条和空状态。
- 新增资源契约测试，校验两端图片尺寸、透明通道、文件大小和引用完整性。

### 修复

- 渲染层现在只在检测到完整 Codex 主界面壳层时启用皮肤；宠物等透明辅助窗口会主动清理主题背景与装饰节点，避免出现遮挡宠物的矩形背景框。
- 安装与 `-RestoreBaseTheme` 现在严格按 UTF-8 读取，保留原换行风格，并以无 BOM、同目录原子替换方式写回 `config.toml`，避免中文项目名称乱码或导致 Codex 无法启动。
- 遇到带 BOM/无 BOM 的 UTF-16、NUL 字符、无效 UTF-8 或写入期间被其他程序改动的配置时停止修改，不再静默转码或覆盖较新的内容。
- 安装会在当前注册包或 state 记录的旧 Codex 仍运行时明确提示先关闭；配置临时文件写完后会在原子替换前再次核对原始字节，进一步缩小并发覆盖窗口。
- 配置恢复只修改 `[desktop]` 内的外观键，不再误碰其他 section 的同名配置；新增 `-RecoverConfigBackup` 用于显式恢复安装前原始文件，并先保存当前文件。
- 完成配置恢复后会归档本轮安装前备份，使下一次安装重新保存当时的配置，避免重复安装使用过期主题值。
- schema 3 记录的旧 injector PID 只有在 Node 精确路径、脚本命令行、端口、Browser ID 和进程启动时间匹配时才会停止；兼容旧 state 时仍要求原 state 含脚本路径和端口，且 PID 仍匹配 `node.exe`、脚本与 watch 参数，无法确认便归档而不结束进程。
- 启动验证失败会停止 injector、清理状态，并把本次新开的 Codex 恢复为无调试口的普通启动。
- Restore 使用状态中记录的端口，先关闭运行态再写配置；失败时保留 state 并尽量正常重开 Codex，不再留下半完成状态或静默报告假成功。
- Store 更新后若旧版本仍持有已保存的 CDP，会按 state 中的精确路径关闭；检测到新旧版本同时运行时安全停止并提示人工处理。
- 支持带注释或引号的 `[desktop]` 表头与目标键；遇到转义同义键、多行字符串/数组、dotted key 或重复目标键时会在写入前明确停止，避免把合法但无法安全行编辑的 TOML 改坏。
- Store 更新后的旧路径只有在 Appx full name、family name、安装目录和可执行文件仍能与系统注册包匹配时才允许自动关闭；无法证明归属时保留状态并要求手动关闭。
- Store 更新时，仍在运行且身份有效的旧版本 CDP 会直接热重应用；旧版本若未开启 CDP，则在获得现有重启授权后关闭并启动当前注册版本，避免并行打开两个 Codex。
- 遇到 `[desktop.*]` 子表时会在写配置前停止，避免外观标量键与 TOML 子表冲突；热重应用验证失败时会尽力移除本次残余样式。
- Restore 不再要求当前环境仍能找到 Node；schema 3 清理会严格匹配安装时记录的 Node 路径，Node 已升级或卸载也不影响安全恢复。

### 安全

- Codex 以 `--remote-debugging-address=127.0.0.1` 启动；同时校验监听 PID 对应精确的官方 Store 可执行文件。
- 说明：loopback 可阻止局域网访问，但 CDP 不验证同一 Windows 用户下的其他本地进程；不用皮肤时建议执行 Restore 关闭调试会话。
- Appx 发现要求 `SignatureKind=Store` 且不是 development mode，同名开发包或侧载包不会被当作官方 Codex 启动或关闭。
- injector 只连接相同端口、page ID 与路径一致的 loopback WebSocket，并在注入前确认真实 Codex shell DOM 标记。
- watcher 绑定启动时的 CDP Browser ID，并持续持有 Browser WebSocket 作为身份锚；它不会直接连接身份变化后的端点，Codex 内部重建浏览器时只会委托启动脚本重新校验并恢复，普通关闭或端口被其他进程复用时仍安全退出。
- CDP HTTP、WebSocket 建连与命令均加入超时，HTTP 探测拒绝重定向，异常目标不会无限挂起或把探测带离 loopback。
- injector 日志与验证文件不再记录窗口标题、页面路由、页面文本或被拒绝 URL 的内容，只保留临时 target ID、结构标记和布局结果。
- 快捷方式不再静默携带 `-RestartExisting`；需要重启时先向用户确认。
- install、start、restore 和 verify 使用当前用户互斥锁，避免双击或并发命令竞争端口、配置和 state。

### 改进

- 默认端口被占用时自动在后续 100 个端口内选择空闲端口；显式指定的冲突端口仍安全失败。
- injector 会等待首轮注入完成再判定启动成功；目标异常时使用有上限的指数退避和限频日志，减少后台唤醒和日志膨胀。
- 明确要求 Node.js 22 或更新版本，并记录 `process.execPath`，兼容 PATH 中的启动转发程序。
- 带空格或结尾反斜杠的测试 profile 路径现在按 Windows 命令行规则引用。

### 测试

- 增加渲染层辅助窗口回归测试，覆盖主窗口正常注入、透明辅助窗口清理残余样式，以及辅助目标随后成为完整主界面时可重新启用皮肤。
- 增加中文项目路径、CRLF/LF、UTF-16 与歧义 TOML 拒绝、并发写检测、section 隔离、精确恢复、Appx/state 身份、状态归档、payload 构造、Browser ID 和不安全 CDP URL 的回归检查。
