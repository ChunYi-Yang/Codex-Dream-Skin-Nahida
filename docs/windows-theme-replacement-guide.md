# Windows 主题换图与换色维护手册

本文档对应当前稳定主题版本 `1.1.75`，适用于仓库中的 Windows 实现。以后更换人物或整体色系时，优先只改图像资源、`theme.json` 和 CSS 调色板，不要修改 Codex 官方安装目录、`app.asar`、签名、账号、API Key 或模型配置。

## 1. 当前稳定行为

- 主题通过本机回环 CDP 注入，只使用 `127.0.0.1`，不修改官方 Codex 文件。
- 桌面入口 `Codex.lnk` 指向签名 Node 运行时和 `windows/scripts/launch-dream-skin.mjs`，普通启动即可进入主题。
- 开机启动入口 `Codex Dream Skin Auto Start.lnk` 指向签名 Node 运行时和 `windows/scripts/launch-dream-skin-at-login.mjs`；开机时如果 Codex 只显示头像/加载窗口而主界面尚未挂载，启动器会保留 watcher 延迟验收，等待主界面出现后继续注入，而不是回滚成官方主题。
- 左侧栏顶部显示“虚空终端”，只改可见品牌节点，不改官方语义、任务正文或真实项目名。
- 首页标题显示“我们应该在虚空中做些什么？”，项目列表和点击后的任务页仍显示真实项目名。
- 首页和设置页隐藏没有内容的顶部项目栏；任务页保留顶部项目栏。
- 首页整体必须单屏显示，不出现右侧滚动条，不需要下滑才能看到横幅或输入框。
- 首页横幅使用深色可读遮罩，文案锚定在横幅左侧，不能回到居中偏右的位置。
- 首页项目选择区只保留“选择项目”标签、项目 chip 和输入框本体；输入框不能遮住项目选择行。
- 输入框保持 Codex 默认宽度逻辑，只套绿色玻璃主题，不再固定为四成宽。
- 文件差异审阅、文件树、终端和摘要区域沿用右侧栏人物背景；文件树、审阅区、终端表面使用 15% 浅绿色玻璃。
- 摘要侧栏、文件树、终端、审阅区域的关闭/打开行为交给 Codex 官方控件，不自定义拦截 `×`。
- 设置页、搜索框、弹窗、菜单、助手输出内容块、会话虚拟化消息卡、代码块和差异预览不能出现不透明纯白背景。

## 2. 文件职责

| 文件 | 职责 | 换主题时是否常改 |
|---|---|---|
| `windows/assets/theme.json` | 主题文案、颜色 token、图片文件名 | 常改 |
| `windows/assets/dream-skin.css` | 布局、透明度、边框、背景叠色和控件状态 | 常改 |
| `windows/assets/renderer-inject.js` | 路由识别、首页标题替换、DOM 标记和清理 | 谨慎改 |
| `windows/scripts/injector.mjs` | CDP 连接、资源校验、版本号、注入和验证 | 只在行为变更时改 |
| `windows/scripts/generate-nahida-assets.ps1` | 从源素材生成运行时资源 | 换图时改 |
| `windows/tests/theme-assets.test.mjs` | 资源、CSS 和结构约束测试 | 随主题规则同步 |
| `windows/tests/renderer-inject.test.mjs` | 注入逻辑、路由识别和清理测试 | 随注入逻辑同步 |
| `windows/CHANGELOG.md` | Windows 行为变更记录 | 每次用户可见变化都改 |

## 3. 当前素材槽位

| 槽位 | 运行时文件 | 用途 |
|---|---|---|
| `hero` | `windows/assets/nahida-hero.jpg` | 首页横幅 |
| `background` | `windows/assets/nahida-background.jpg` | 主区域和设置页背景 |
| `sidebar` | `windows/assets/nahida-sidebar.jpg` | 左侧项目导航 |
| `rightPanel` | `windows/assets/nahida-right-panel.png` | 右侧工具栏、文件树、终端、审阅区 |
| `portrait` | `windows/assets/nahida-portrait.jpg` | 首页右下角画片 |
| `decorations` | `windows/assets/nahida-decorations.png` | 首页装饰图集 |
| `scene` | `windows/assets/nahida-scene.png` | 背景装饰层 |

视频素材只取首帧。示例：

```powershell
ffmpeg -i .\input.mp4 -frames:v 1 .\first-frame.png
```

## 4. 换图流程

1. 把新素材放到主题源目录，例如 `D:\codex_theme\纳西妲` 或新的角色目录。
2. 修改 `windows/scripts/generate-nahida-assets.ps1` 中对应源文件路径，或按相同输出名手动替换 `windows/assets/nahida-*.jpg/png`。
3. `windows/assets/theme.json` 里的图片名只能引用 `windows/assets/` 内的 basename，不能写绝对路径或 `..`。
4. 单张运行时资源不超过 16 MB，总主题资源不超过 32 MB。
5. 透明图使用 PNG；照片和背景类优先 JPG。
6. 换图后运行验证命令，确认尺寸、透明通道和文件引用都通过。

## 5. 换色流程

优先改 `windows/assets/theme.json` 的 `colors`：

| 字段 | 用途 |
|---|---|
| `background` | 页面基础底色 |
| `panel` | 主要面板底色 |
| `panelAlt` | 次级面板底色 |
| `accent` | 主按钮、发送按钮、选中态 |
| `accentAlt` | 高亮辅助色 |
| `secondary` | 次级强调色 |
| `highlight` | 金色/暖色点缀 |
| `text` | 主文字 |
| `muted` | 弱文字 |
| `line` | 玻璃边框和分隔线 |

常用透明度：

- `--dream-panel-glass: rgba(216, 237, 199, .50)`：输入框、摘要、弹层的主要玻璃。
- `rgba(216, 237, 199, .15)`：可复制提示词/写作块（`[data-oai-writing-block-surface][data-markdown-copy="code-block"]`）的轻量叶绿玻璃背景；不要用于普通 assistant 输出区、整条会话容器、用户气泡或输入框。assistant 输出块外层、markdown 容器、markdown 文本/列表/标题/表格/引用块等普通输出内容元素都必须保持透明。
- `rgba(216, 237, 199, .42)`：添加面板、弹层内层或非输出区域中需要明显离开白底的叶绿玻璃背景。
- `rgba(235, 245, 226, .15)`：文件树、终端、审阅正文的低透明背景。
- `rgba(247, 250, 239, .84)`：搜索框和需要强可读性的输入框。
- 首页深色遮罩要保留，保证白色标题可读。

## 6. 首页与输入框规则

- 首页有原生 `home-icon`、`data-feature="game-source"` 或仅剩输入框容器时，注入器都应识别为首页；可见任务聊天、任务标题、设置页、已安排/插件搜索页以及已安排/插件/拉取请求详情页当前导航会阻止首页模式。
- 首页原生标题容器标记为 `.dream-home-hero-surface` 时，不能强依赖 `home-icon`；Codex 重渲染移除图标后也要重新标记横幅。
- 首页横幅文案通过 `[data-feature="game-source"]` 固定在左侧，当前锚点为 `left: 40px`，不能被原生 flex 居中推回右侧。
- 首页没有原生标题/建议卡但确实是空白开始页时，注入器创建 `#codex-dream-home-fallback`。
- 普通任务页只要有可见 `.thread-scroll-container` 或 `[data-thread-find-target="conversation"]` 且文本非空，就不能显示首页 fallback。
- `.dream-home-shell .composer-surface-chrome::before` 必须隐藏，避免输入框上方出现多余小装饰块。
- 项目选择区允许显示“选择项目”和项目 chip，但不允许出现额外大白框、顶部白边、底部白边或白色渐变。
- 项目选择行必须位于输入框玻璃层上方，设置独立 `z-index`；输入框不能遮住它，且两者之间不保留明显空白带。
- 输入框不能因为项目选择区或 Codex 重挂载祖先容器而被推到需要下滑才能看到的位置；找不到项目选择祖先时，要回退标记 sticky/最近父容器为 `.dream-home-composer-surface`。

## 7. 启动链规则

- 正常入口：当前用户桌面的 `Codex.lnk`；桌面目录使用 PowerShell 的 `[Environment]::GetFolderPath('Desktop')` 解析。
- 目标应为签名 Node：`C:\devtools\nodejs\node-v22.13.1-win-x64\node.exe`。
- 参数应为：`D:\codex_theme\windows\scripts\launch-dream-skin.mjs`。
- 启动状态文件：`%LOCALAPPDATA%\CodexDreamSkin\state.json`。
- 启动日志：`launcher.log`、`verify.log`、`verify-start.out.log`、`injector-error.log`、`browser-recovery.log`。
- 本机 `D:\codex_theme\CodexDreamSkin` 主题管理器与纳西妲共用状态目录和 CDP 会话，必须保持互斥，不能同时运行两个 watcher。
- 管理器已安装且 `%LOCALAPPDATA%\CodexDreamSkin\paused` 不存在时，纳西妲桌面启动和开机启动会在获取共享锁之前转交给管理器的 `engine\scripts\start-dream-skin.ps1`。
- 管理器托盘切换背景图或已保存主题后必须主动调用自己的启动脚本，由该脚本校验并停止已记录的纳西妲 watcher；只修改 `active-theme` 文件不够。
- 管理器暂停时会创建 `paused`，纳西妲启动器不再转交；下一次点击桌面 `Codex` 或登录启动时恢复纳西妲。更新管理器后需确认安装目录中的托盘脚本仍包含这两处启动调用。
- 不要把快捷方式改回 PowerShell 或自制 exe，避免安全软件拦截。
- 不启用 ECC，不修改官方安装目录，不修改 WindowsApps 包内容。

## 8. 验证命令

每次改 CSS、注入逻辑、启动链或素材后运行：

```powershell
node windows\tests\renderer-inject.test.mjs
node windows\scripts\injector.mjs --self-test
node windows\scripts\injector.mjs --check-payload
node windows\tests\theme-assets.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File windows\tests\run-tests.ps1
```

热更新当前窗口：

```powershell
$state = Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA "CodexDreamSkin\state.json") -Raw | ConvertFrom-Json
& $state.nodePath $state.injectorPath --once --reload --port $state.port --browser-id $state.browserId --timeout-ms 30000
```

验收时至少检查：

- 普通任务页没有首页横幅盖住聊天。
- 点击“新建任务”后首页横幅在主背景上方区域，文案靠左，输入框无需下滑即可看到。
- 选择项目后只保留项目 chip 和输入框，不出现额外白框或遮挡。
- 设置页没有顶部空白项目框。
- 侧边栏、右侧工具栏、文件树、终端、审阅区背景和透明度一致。
- 重启 Codex 后仍通过桌面 `Codex` 进入主题。

## 9. 记录要求

- 每次用户可见变化写入 `windows/CHANGELOG.md`。
- 每次改变稳定规则，同步更新本文件。
- 删除临时文件、旧启动器、旧素材前必须先询问用户并获得明确确认。
- 不要记录私密任务正文、API Key、账号信息或模型配置。
