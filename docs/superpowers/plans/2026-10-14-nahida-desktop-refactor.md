# 新版 Codex / Work 纳西妲主题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本次由主智能体连续实施，完成后进行一次独立代码审阅。

**Goal:** 按已认可的浅色概念图完成 Windows 新版 Codex/Work 的纳西妲主题重构，提供通过必要测试的安装包、校验和、安装与恢复说明。

**Architecture:** 保留 Windows 启动、loopback CDP 与恢复基础，将界面识别和主题视觉分开；运行时源码经生成工具输出到现有部署路径。纳西妲多图为受信任本地扩展，社区 Safe CSS 权限保持原合同。概念图用于颜色与构图，原生布局和交互以新版实机为准。

**Tech Stack:** Windows PowerShell、Node.js ESM、CSS、Store 包激活、CDP、Inno Setup 6；运行时 Node 使用仓库已审阅的固定版本。

**Spec:** `docs/nahida-desktop-refactor-proposal-2026-10-14.md`；概念图保存在实施者本机，公开文档不记录用户目录或私人会话标识。

## Global Constraints

- 产品只支持 Windows，不恢复 macOS 安装器和发布依赖。
- 原始工作区 `D:/codextheme` 的既有未提交改动不覆盖、不丢弃。
- 实施工作区：独立的本地 Git worktree，基线 HEAD：`6d46655ebadb9c462b00efd65ecb8d32203e0139`。
- 上游参考固定为 v1.5.20 / `1c2e8fea9e44e2ce8384bbd1c8759b99397c5d7d`，不整仓替换。
- 本机已知应用版本 `26.1007.2314.0`；当前运行实例没有发现 CDP 监听端口，实机验证尚未完成。
- 保留 hero、background、sidebar、rightPanel、portrait、decorations、scene 七个素材槽位。
- 不改 WindowsApps、`app.asar`、官方二进制或签名、API Key、Base URL；CDP 仅绑定 loopback。
- 既有登录 profile 不迁移、复制或删除；常规入口必须解析为同一有效 profile。
- 图层使用 `pointer-events: none` 与 `aria-hidden`；不接管原生导航、面板关闭、分栏拖动与滚动。
- 普通助手输出透明；保留终端 ANSI、代码语法及 diff 红绿语义色；浏览器网页和文档画布不染色。
- 图片单个、总量和路径限制沿用加载器安全合同；不扩大社区 CSS 能力以支持内部多图。
- 配置继续严格 UTF-8、原子写入及可恢复备份，中文项目名与无关 TOML 必须通过回归。
- 不自动安装到当前使用中的桌面实例、不关闭本次聊天窗口；生成安装包与现场安装是不同操作。
- 未通过首页与会话实机检查，不宣称新版兼容通过，不发布正式安装包。
- 不删除非临时文件；本次中间文件仅在核实绝对路径和用途后清理。交付包、备份与源文件保留。
- 用户已授权生成安装包；版本提升只在确认候选交付版本时统一修改，不借用上游版本号冒充同一产品。

## Review Focus

- 隐藏保留的首页节点与空加载页：不得误显示横幅；由任务 2 覆盖。
- 右侧面板打开、窗口变矮、高 DPI 与多行输入：输入框不得裁切，主区不产生横向溢出；由任务 3 覆盖。
- 包更新、不同启动入口和旧 profile：保留登录，不把两个注入器同时挂到同一 renderer；由任务 4 覆盖。
- 用户主题字符串含 `$`、中文、引号及反斜杠：payload 值原样保留，模板不可被拼接污染；由任务 1 覆盖。
- 打包过程重写默认主题、漏装任一素材、缺少编译器或签名校验失败：拒绝不完整包，不悄悄回到其他默认主题；由任务 5 覆盖。

## 已执行的准备

- [x] 创建并附加隔离工作区，复制现有相关工作内容；原目录未修改产品代码。
- [x] 记录既有删除，未在工作区重放整文件删除。
- [x] 运行 Node 基线：35 项，28 通过，7 失败。
- [x] 识别基线失败：renderer 测试引用不存在的 `tools/renderer-runtime.test.mjs`；payload 版本占位符与测试契约不一致；主题测试仍约束旧布局。
- [x] 识别 Windows 总测试仍引用已移除的 macOS 测试路径，需要迁到 Windows 可独立运行的合同。
- [x] 识别安装器把默认主题改写为 Gothic，必须给本地纳西妲交付增加明确构建模式。
- [x] 当前常见安装路径中未找到 Inno Setup 编译器，打包前需检测已有工具或获取隔离工具。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `runtime/renderer-inject.js` | 注入入口、图层应用、调度与完整清理 |
| `runtime/layout-adapter.mjs` | 有证据的区域识别、可见性与页面状态 |
| `runtime/nahida-layout.mjs` | 与 DOM 无关的可用空间及装饰降级决策 |
| `runtime/dream-skin.css` | 基础区域适配，消除旧结构路径 |
| `runtime/nahida-theme.css` | 明暗 token、玻璃与自有装饰 |
| `tools/sync-runtime-assets.mjs` | 生成部署模板及 CSS，支持只检查模式 |
| `tools/selectors.json` | 新旧选择器、范围、必要性与来源 |
| `windows/assets/renderer-inject.js`、`dream-skin.css` | 生成的部署副本，仍供现有 injector 加载 |
| `windows/scripts/runtime-settings.mjs`、`runtime-settings.ps1` | 共同运行配置合同与入口读取 |
| `windows/scripts/injector.mjs` | 安全多图加载、payload 构建、会话验证 |
| `windows/installer/build-release.ps1` | 完整 staging、纳西妲构建模式、工具校验、编译 |
| `windows/tests/*` | Windows 独立回归、DOM 合同、生命周期及安装包检查 |
| `docs/testing/nahida-desktop-refactor-validation.md` | 实际验证证据与未通过项 |

### Task 1: 修复基线并建立可重复生成的运行时源

**Files:** Create `runtime/renderer-inject.js`, `runtime/dream-skin.css`, `tools/sync-runtime-assets.mjs`, `windows/tests/runtime-assets-sync.test.mjs`；Modify `windows/scripts/injector.mjs`, `windows/tests/payload-template-integrity.test.mjs`, `windows/tests/renderer-inject.test.mjs`, `windows/tests/run-tests.ps1`；Create `windows/tests/safe-css-validator.test.mjs`。

**Interfaces:** `loadPayload(themeDir?, candidateTheme?) -> { payload, revision, ...themeState }` 保持现有导出；`node tools/sync-runtime-assets.mjs [--check]` 生成或比较部署资产，不在检查模式写入；renderer 延续 `(cssText, artDataUrls, theme, version)` 多图调用合同。

- [ ] 记录现有失败的完整诊断，补充真实 `loadPayload()` 测试，断言 `$` 模式原样保留、所有占位符消失、脚本可编译、Safe CSS 校验继续生效。
- [ ] Run `node --test windows/tests/payload-template-integrity.test.mjs windows/tests/renderer-inject.test.mjs`；预期先复现基线缺陷。
- [ ] 修复版本占位符和测试调用契约；把 renderer 生命周期测试变为 Windows 自包含，保留主窗口、辅助窗口、重复注入、暂停和恢复断言。
- [ ] 将当前有效 CSS/renderer 作为唯一源；实现生成工具与一致性测试。将 Safe CSS 测试迁到本仓库现有模块，替换总测试中的 macOS 路径。
- [ ] Run `node tools/sync-runtime-assets.mjs --check` 和相关 Node 测试；预期全通过，`--check` 不改变文件。
- [ ] 检查暂存范围，仅提交本任务相关文件；提交说明 `fix(windows): restore standalone runtime test contracts`，不添加共同作者。

### Task 2: 新版布局适配与页面状态

**Files:** Create `runtime/layout-adapter.mjs`, `windows/tests/layout-adapter.test.mjs`；Create `tools/selectors.json`；Modify `runtime/renderer-inject.js`, `tools/sync-runtime-assets.mjs`, `windows/assets/selectors.json`, `windows/tests/home-surface-detection.test.mjs`。

**Interfaces:** `createLayoutAdapter(document, window, contract) -> { discover(), cleanup() }`；`discover() -> { page, mode, regions, viewport, missingRequired }`，page 为 `home|thread|settings|secondary|unknown`，mode 为 `codex|work|unknown`。regions 包含 `main, navigation, sidebar, header, composer, rightPanel`，缺失值为 null。仅对已确认区域添加 `data-ds-part`。

- [ ] 在独立验证实例中采集本机版本脱敏 DOM；先核实 package/profile/port，当前聊天实例保持运行。若无法取得已登录实例，则记录实机阻碍，不伪造 fixture。
- [ ] 编写隐藏首页、加载中次级页面、仅输入框、会话正文、设置页、辅助窗口测试；断言 unknown 与 secondary 无 hero，隐藏节点不成为活动页面，菜单不改变底层状态。
- [ ] Run `node --test windows/tests/layout-adapter.test.mjs`；预期新接口尚未存在时失败。
- [ ] 实现适配器，优先稳定属性并记录验证来源，限制后备范围；Work/Codex 只有结构实测不同才增加分支。
- [ ] 将适配器通过生成链编入部署模板，保持现有安全多图 payload 接口，所有标记可清理。
- [ ] Run 适配器、renderer、payload、首页状态测试及生成一致性检查；预期通过。
- [ ] 提交 `feat(windows): adapt theme regions to the new desktop shell`。

### Task 3: 纳西妲视觉迁移及可用空间适配

**Files:** Create `runtime/nahida-layout.mjs`, `runtime/nahida-theme.css`, `windows/tests/nahida-layout.test.mjs`；Modify `runtime/dream-skin.css`, `runtime/renderer-inject.js`, `windows/assets/theme.json`, `windows/tests/theme-assets.test.mjs`, `tools/sync-runtime-assets.mjs`。

**Interfaces:** `resolveNahidaLayout({ width, height, composerHeight, page, reducedMotion }) -> { heroMode, showPortrait, showParticles }`；heroMode 为 `full|compact|off`。使用主内容区宽高；页面非 home 一律 off。建议 full 仅在 width≥900、height≥760 且输入区留足空间时启用；compact 在 width≥640、height≥600 时启用；其他 off。视实际新版 DOM 可将阈值保守提高，并记录理由。

- [ ] 添加主区 1080×900、820×720、560×700、1000×500、多行 composerHeight=280、thread 和 reducedMotion 测试，先证明旧固定规则不能满足空间决策。
- [ ] Run `node --test windows/tests/nahida-layout.test.mjs`；预期失败。
- [ ] 实现纯布局决策函数；完整与紧凑横幅采用 `clamp()` 与可用空间预算，输入框保持原生尺寸，不给官方首个子节点固定最小高度。
- [ ] 迁移浅色叶绿与深色森林 token，保留现有七图。优先语义区域样式，移除被替代的结构规则；图片焦点与玻璃由配置控制。
- [ ] 更新旧源码断言，保留并加强实际素材路径、输出透明、图层避让、明暗切换和清理测试，不以删掉检查换取通过。
- [ ] Run 相关 Node 回归及生成检查；实机检查首页/任务、右栏开关、1280×720、1920×1080、高 DPI、多行输入与减少动态效果，记录截图。
- [ ] 提交 `feat(windows): render adaptive Nahida glass and artwork`。

### Task 4: 统一启动配置及主题生命周期

**Files:** Create `windows/scripts/runtime-settings.mjs`, `windows/scripts/runtime-settings.ps1`, `windows/tests/runtime-settings.test.mjs`, `windows/tests/runtime-settings.tests.ps1`；Modify 常规、登录 launcher 与 `start-dream-skin.ps1`、恢复委派读取处。

**Interfaces:** `resolveRuntimeSettings({ stateRoot, savedState, explicitProfile, explicitPort }) -> { profilePath, port }`；对应 PowerShell `Resolve-DreamSkinRuntimeSettings` 返回同名字段。优先显式参数，其次通过现有来源校验的已保存设置，其次已有 `Profile-v3`，最后创建 `cdp-profile`；不遍历、复制或删除登录内容。端口沿用 9335 默认和现有校验范围。

- [ ] 先测试中文/空格路径、显式参数、已保存 profile、已有 Profile-v3、无 profile、异常配置及不同入口一致性。
- [ ] 运行新增配置测试，预期失败。
- [ ] 实现统一解析，保持操作锁、browser ID 与端口所有者校验；原有恢复与重启授权语义不放宽。
- [ ] 纳西妲和社区主题切换验证当前实际 themeId，三种状态区分完整/基础/未应用；必要区域不可见必须失败，装饰缺失可降级。
- [ ] Run 配置、启动、one-shot、state recovery 与 Windows 总测试；验证第二次启动仍已登录。
- [ ] 提交 `fix(windows): share profile settings across theme launch paths`。

### Task 5: 本地纳西妲安装包构建

**Files:** Modify `windows/installer/build-release.ps1`, `windows/installer/codex-dream-skin.iss`, `windows/installer/setup-bootstrap.ps1`, `windows/tests/installer-static.tests.ps1`；Create `windows/tests/installer-nahida-payload.tests.ps1`；Modify `windows/CHANGELOG.md`, `windows/README.md`, `windows/README.en.md`, `docs/install-windows.md`；最后统一候选版本常量。

**Interfaces:** 增加明确的 `build-release.ps1 -ThemeFlavor NahidaLocal` 本地交付模式；默认公共构建仍维持其已审阅素材合同。纳西妲模式输出独立文件名，保留本地主题 JSON 和全部被引用素材；创建 SHA-256 文件。不自动发布 GitHub Release。

- [ ] 测试本地构建 themeId 为 nahida-dream，七个引用素材齐全、路径受限、staging 未改成 Gothic、签名 Node 和完整性检查保持生效；预期现有 builder 不满足。
- [ ] 实现模式和独立输出名，许可说明沿用 NOTICE；概念效果图不作为运行时整窗背景打包。
- [ ] 检测 Inno Setup；无已有编译器时使用官方来源的隔离工具，并核实下载来源和签名，不修改全局软件设置。固定 Node 下载验证仓库 SHA-256 与 Authenticode，不绕过失败。
- [ ] Run Windows 总测试、installer-static 和所有 Node 回归，预期全部通过。
- [ ] 在通过实机检查后，生成候选安装包，记录版本、大小、SHA-256、源码基线和测试结果；保留可回滚说明。
- [ ] 提交 `build(windows): package the local Nahida theme with verified assets`。

### Task 6: 最终审阅与交付

**Files:** Create `docs/testing/nahida-desktop-refactor-validation.md` 与安装包旁的交付说明、校验和。

**Interfaces:** 交付包括安装 EXE、SHA-256、安装/升级/恢复步骤、已验证应用版本、实机截图和已知限制。源代码保留在附加工作区，原工作区仅添加方案与交付物链接。

- [ ] 检查安全边界、未知结构降级、清理完整性和 profile 一致性；进行一次独立代码审阅。
- [ ] 修复影响使用或安全的审阅问题，补充有意义的回归测试，重新运行受影响检查。
- [ ] 核对安装包 staging 与引用资源、输出版本及校验和；不得把未经过实机检查的包称为可发布版本。
- [ ] 打开交付说明并给出安装包链接，明确当前聊天实例尚未现场安装。涉及关闭应用或覆盖已有安装时，再取得该具体操作的授权。

## 安装与恢复顺序

1. 查看交付说明并核对安装包 SHA-256。
2. 保存当前任务与输入内容，退出桌面应用。
3. 运行候选安装包，保留已有 profile、主题库和配置备份。
4. 从新快捷方式启动，核实主题、真实输入区和工具面板；第二次启动检查登录保持。
5. 需要恢复时使用恢复入口，验证原生外观和无关配置；任何历史 profile 和备份均保留。

## 自审结果

提案的布局、视觉、多图、明暗、启动、验证、降级、恢复与打包均已对应任务；五类重点失败条件均有所属测试。与概念图不同之处：不会创造官方不存在的导航、建议卡或主题配色面板，实机没有的控件不为追求截图外观而注入。安装器生成与现场安装分开，当前聊天不被中断。
