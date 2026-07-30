# Codex Dream Skin · Nahida

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>为 Windows Codex 桌面端打造的纳西妲「梦境林庭」主题。</strong><br>
  分层主题资源 · 原生控件保留 · 本机回环 CDP 注入 · 随时恢复官方外观
</p>

<p align="center">
  <img src="docs/images/nahida-home.png" alt="纳西妲梦境林庭主题在 Codex Windows 首页的实机效果" width="960">
</p>

> [!IMPORTANT]
> 本项目仅支持 Windows，是非 OpenAI 官方的桌面端外观定制工具。它不会修改
> WindowsApps、`app.asar`、官方二进制、代码签名、API Key 或 Base URL。

## 主题效果

「梦境林庭」不是整窗截图覆盖。背景、侧栏、横幅、人物、装饰和空状态场景由独立资源组成，
Codex 的侧栏、项目选择、任务菜单、设置项和输入框仍是原生可交互控件。

<p align="center">
  <img src="docs/images/nahida-task.png" alt="纳西妲主题在 Codex 任务页的实机效果" width="960"><br>
  <sub>任务页会降低背景干扰，输出面板与输入框保持可用</sub>
</p>

<p align="center">
  <img src="docs/images/nahida-settings.png" alt="纳西妲主题在 Codex 设置页的实机效果" width="960"><br>
  <sub>设置页、主题选择和其他原生页面继续使用同一套半透明视觉层</sub>
</p>

## 功能

- **分层纳西妲主题**：主背景、侧栏、Hero、人物、装饰图集与场景分别适配首页和任务页。
- **原生交互不变**：主题层不接管鼠标事件，真实按钮、菜单、输入框和设置仍可操作。
- **登录自动应用**：安装后可选择随 Windows 登录启动，本地纳西妲主题是明确的默认入口。
- **托盘主题管理**：暂停、重新应用、更换背景、保存/切换主题、导入 ZIP 和恢复官方外观。
- **社区主题兼容**：支持 DreamSkin.cc 一键换肤及经过校验的本地主题 ZIP。
- **失败可回滚**：启动、注入或验证失败时保留诊断并执行受控恢复，不修改官方安装包。

## 运行要求

- Windows 10 或更高版本，x64。
- 从 Microsoft Store 安装并已注册到当前用户的官方 `OpenAI.Codex`。
- 使用 Release 安装包时无需另装 Node.js；从源码运行需要 Node.js 22 或更高版本。
- Windows PowerShell 5.1 或 PowerShell 7。

## 安装

### 安装包

从本仓库的 [Releases](https://github.com/447662/Codex-Dream-Skin-Nahida/releases)
下载 `CodexDreamSkin-Setup-vX.Y.Z.exe`。关闭 Codex 后运行安装器，按向导完成即可。

安装器按当前用户安装，不需要接管 WindowsApps 权限。未签名的新下载可能触发 SmartScreen；
请核对仓库与校验值后使用“更多信息 → 仍要运行”，不要关闭 Defender。

### 从源码安装

克隆仓库后，在仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\scripts\install-dream-skin.ps1
```

安装完成后可从开始菜单打开 `Codex Dream Skin`。命令行启动方式：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\scripts\start-dream-skin.ps1 -UseLocalTheme -PromptRestart
```

首次启动或切换主题可能需要重启已打开的 Codex，请先保存尚未发送的输入。

## 验证与恢复

启动后可生成验证截图，并检查 CDP、原生侧栏、输入框和主题标记：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\scripts\verify-dream-skin.ps1 `
  -ScreenshotPath "$env:TEMP\codex-dream-skin.png"
```

恢复官方外观：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\scripts\restore-dream-skin.ps1 `
  -RestoreBaseTheme -PromptRestart
```

恢复只处理 Dream Skin 管理的外观配置和已验证会话。用户任务、插件、宠物、账号与认证状态不会被删除。

## 更换主题

打开系统托盘中的 `Codex Dream Skin` 菜单，可以：

- 重新应用或暂停皮肤；
- 切回“本地纳西妲 · 梦境林庭”；
- 更换 PNG、JPEG 或 WebP 纯背景；
- 保存当前主题或切换已保存主题；
- 导入符合约束的普通 `.zip` 主题包；
- 打开 [DreamSkin Gallery](https://dreamskin.cc/gallery) 和
  [在线 Studio](https://dreamskin.cc/studio)。

不要把带窗口、按钮、文字或输入框的效果截图当作背景导入。主题资源的路径、尺寸和 ZIP 安全限制见
[Windows 使用说明](./windows/README.md)；制作自己的主题可参考
[主题替换指南](./docs/windows-theme-replacement-guide.md)。

## 项目结构

```text
Codex-Dream-Skin-Nahida/
├── windows/
│   ├── assets/       # 纳西妲主题资源、CSS、渲染注入与主题配置
│   ├── scripts/      # 安装、启动、托盘、验证与恢复
│   ├── installer/    # Windows Release 安装器
│   ├── presets/      # 安装包可分发预设
│   ├── references/   # QA 与运行记录
│   └── tests/        # Windows 回归测试
├── docs/             # 安装、换图与 README 截图
├── LICENSE
└── NOTICE.md
```

## 开发与测试

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\run-tests.ps1

powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\installer-static.tests.ps1
```

视觉或注入改动还需要在真实 Codex 上检查首页与普通任务页，并执行 Verify、Restore、重新应用流程。
贡献前请阅读 [贡献指南](./.github/CONTRIBUTING.md) 和 [Windows 实现约束](./windows/SKILL.md)。

## 安全边界

- CDP 仅绑定 `127.0.0.1`；主题运行时不要运行来路不明的本机程序。
- 只控制经过 Store 包身份、进程路径、端口与 Browser ID 校验的 Codex 会话。
- 不修改 WindowsApps、`app.asar`、官方二进制、签名或应用权限。
- 不写入 API Key、Base URL 或模型供应商配置。
- `config.toml` 使用严格 UTF-8、原子写入和可恢复备份，只处理受管的外观字段。

## 来源、许可与素材声明

本项目基于 [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin)
的 Windows 实现整理，并针对纳西妲分层主题、登录启动和本地主题切换进行了适配。

软件代码采用 [MIT License](./LICENSE)。纳西妲、原神及相关人物/IP 素材不属于 MIT 授权范围；
公开、商业或二次分发前，请自行确认版权、角色形象与商标授权。完整边界见 [NOTICE.md](./NOTICE.md)。

## 赞助

感谢 [Passion8](https://passion8.cc/register?aff=TuPe) 对原项目的支持。换肤与 API 配置完全独立，
本项目不会自动修改任何模型供应商设置。

---

愿智慧如新叶生长，让每一次构建都抵达更明亮的梦。
