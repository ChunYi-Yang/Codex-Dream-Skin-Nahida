# 在另一台电脑通过 Codex 安装

## 你需要做什么

1. 使用 Windows 10/11 x64，从 Microsoft Store 安装官方 Codex 并正常登录。
2. 从 [ChunYi-Yang/Codex-Dream-Skin-Nahida](https://github.com/ChunYi-Yang/Codex-Dream-Skin-Nahida) 获取 main 分支的完整源码并解压，或通过 HTTPS 克隆。将该目录作为 Codex 项目打开，不要只复制脚本或图片。
3. 对 Codex 说：

   > 帮我安装这个项目的纳西妲主题。请读取 AGENTS.md 和 docs/install-with-codex.md，检查环境、准备依赖，并安排在我正常退出 Codex 后安装。保留账号、聊天和原有配置，不要强制关闭当前窗口。

4. Codex 报告后台安装已准备好后，保存未发送输入，使用应用的“退出”命令完全退出 Codex；仅关闭窗口可能仍留下后台进程。若已有主题托盘，也先退出托盘。保持源码文件夹原位。
5. 后台任务会等待最多 15 分钟，确认 Codex 已退出后安装，然后重新打开 Codex 并验证主题。首次使用独立主题 profile 时可能需要重新登录；不会复制旧电脑的登录数据。
6. 重新打开后说：“检查这次主题安装是否成功，并检查首页和任务页。”

无需复制本机 SSH 密钥、历史备份或任何账号文件。公开仓库可直接下载源码。

安装后用 `Codex Dream Skin` 快捷方式打开主题，普通 `Codex` 入口保留原生外观。
主题默认带齐七张分层素材，包括次级标签页的独立背景。人物卡片随页面缩放，并与横幅同步显隐。
项目文件、插件、宠物和本机工具需要在新电脑单独准备；这些不是主题分发的数据。

## 给 Codex 的执行步骤

从当前 checkout 的绝对路径运行以下命令，始终保留 `RemoteSigned`：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\setup.ps1 -CheckOnly
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\setup.ps1 -PrepareOnly
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\setup.ps1
```

- `CheckOnly` 仅检查官方 Store 包和已安装 Node，不下载、不写主题配置。
- `PrepareOnly` 优先使用通过发布者签名与版本检查的 Node.js 22+。缺少 Node 时，只从固定 `nodejs.org` 地址下载仓库已审核的 Node 22.23.1，核对 SHA-256 和 Authenticode 后使用。不修改全局 PATH。
- 默认模式后台等待用户正常退出。不得自行强制关闭 Codex，不得将等待状态报告为安装成功。
- 如果 ZIP 下载区标记或企业执行策略阻止源码脚本，解释具体错误；不要修改系统执行策略或批量解除下载标记。可改用 Git 克隆，或使用可信 Release 安装器。
- 用户在其他机器上仍需要有效登录和联网；官方应用或 Node 下载被网络策略阻止时，明确报告，不关闭 Defender 或绕过签名检查。

状态文件位于 `%LOCALAPPDATA%\CodexDreamSkin\conversation-install.json`，阶段为 `waiting`、`installing`、`starting`、`verified` 或 `failed`。标准输出与错误分别在同目录的 `conversation-install.out.log`、`conversation-install.err.log`。失败时检查具体错误，修复后重试，不能用重复启动掩盖失败。

安装结束后从受管 engine 执行验证：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File "$env:LOCALAPPDATA\CodexDreamSkin\engine\scripts\verify-dream-skin.ps1" `
  -ScreenshotPath "$env:TEMP\codex-dream-skin-verify.png"
```

`verified` 表示启动阶段自动检查通过；交付验收还需检查首页和任务页的布局、输入、侧栏和背景。
当前官方 Codex 版本可能改变 DOM，安装失败时不得声称新版兼容。

## 排障与更新

| 现象 | 检查方法 |
| --- | --- |
| 状态为 `waiting` | 保存输入并正常退出所有 Codex 窗口及主题托盘；等待任务不会替你强制关闭应用。超过 15 分钟后重新运行 setup。 |
| 首次主题窗口要求登录 | 在新电脑的主题窗口自行登录，不复制其他电脑的认证文件。 |
| 点击主题入口无窗口或只有原生外观 | 查看 `conversation-install.err.log`、`launcher.log`、`launcher-start.err.log`；从受管 engine 运行 Verify。进程或快捷方式存在不代表主题已生效。 |
| 找不到图片或运行脚本 | 确认获取了完整源码，`windows/assets/theme.json` 引用的七张图片及 `windows/scripts/` 均在。不要从旧机器复制固定绝对路径。 |
| 下载或执行被阻止 | 检查网络和组织策略，ZIP 脚本被标记时优先使用 HTTPS Git 克隆；保留签名、哈希与 RemoteSigned 检查。 |
| 已安装但效果比主分支旧 | 更新源码后重新按 CheckOnly、PrepareOnly、默认 setup 流程安装；不要重复使用旧 Release 来期待新修复。 |

主题安装完成后，运行所需文件位于 `%LOCALAPPDATA%\CodexDreamSkin\engine`，
源代码目录可保留用于更新，但日常快捷方式不依赖其路径。诊断文件可能包含本机路径，公开反馈前先检查内容。

## 恢复官方外观

从桌面运行 `Codex Dream Skin - Restore`，或由 Codex 在说明重启影响后执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File "$env:LOCALAPPDATA\CodexDreamSkin\engine\scripts\restore-dream-skin.ps1" `
  -RestoreBaseTheme -PromptRestart
```

恢复仅处理受管主题外观，不删除聊天、认证、插件或宠物。
