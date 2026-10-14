# 在另一台电脑通过 Codex 安装

## 你需要做什么

1. 使用 Windows 10/11 x64，从 Microsoft Store 安装官方 Codex 并正常登录。
2. 下载本仓库源码并解压，或者让 Codex 克隆本仓库。将该目录作为 Codex 项目打开。
3. 对 Codex 说：

   > 帮我安装这个项目的纳西妲主题。请读取 AGENTS.md 和 docs/install-with-codex.md，检查环境、准备依赖，并安排在我正常退出 Codex 后安装。保留账号、聊天和原有配置，不要强制关闭当前窗口。

4. Codex 报告后台安装已准备好后，保存未发送输入，退出 Codex；若已有主题托盘，也先退出托盘。保持源码文件夹原位。
5. 后台任务会等待最多 15 分钟，确认 Codex 已退出后安装，然后重新打开 Codex 并验证主题。首次使用独立主题 profile 时可能需要重新登录；不会复制旧电脑的登录数据。
6. 重新打开后说：“检查这次主题安装是否成功，并检查首页和任务页。”

无需复制本机 SSH 密钥、历史备份或任何账号文件。公开仓库可直接下载源码。

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

## 恢复官方外观

从桌面运行 `Codex Dream Skin - Restore`，或由 Codex 在说明重启影响后执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File "$env:LOCALAPPDATA\CodexDreamSkin\engine\scripts\restore-dream-skin.ps1" `
  -RestoreBaseTheme -PromptRestart
```

恢复仅处理受管主题外观，不删除聊天、认证、插件或宠物。
