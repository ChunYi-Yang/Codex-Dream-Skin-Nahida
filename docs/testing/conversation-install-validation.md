# 对话安装验证记录

验证日期：2026-10-14。验证对象：本仓库 Windows 1.5.18 工作区及新增的 `windows/setup.ps1`，不是另一个工作目录正在开发的 1.6.0。

## 已通过

- `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/run-tests.ps1`：退出码 0，配置事务、恢复范围、状态安全、社区主题、ZIP 导入、启动失败恢复、窗口就绪、包身份与 loopback CDP 检查通过。
- `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/installer-static.tests.ps1`：退出码 0，安装器清单、执行策略、引导、卸载、登录启动和构建契约通过。
- `node --test windows/tests/*.test.mjs`：39 项通过，0 失败，0 跳过。包含真实 renderer payload 的隔离执行、版本校验、清理，以及后台安装成功与失败状态回归。
- `node windows/scripts/injector.mjs --check-payload`：1.5.18 Nahida payload 检查通过。
- `windows/setup.ps1 -CheckOnly` 与 `-PrepareOnly`：识别本机官方 Store 包和已签名 Node 24.19.0。
- 在隔离目录中移除 PATH 里的 Node 后执行 `-PrepareOnly`：成功从固定官方地址下载 Node 22.23.1，核对归档 SHA-256，并验证 `node.exe` 的 OpenJS Foundation Authenticode 签名为 `Valid`。
- 隔离的中文目录安装测试：后台 worker 依次执行安装、启动、记录 `verified`；模拟安装异常时记录 `failed`。测试不修改真实应用或用户配置。

## 实机验收限制

当前运行的 Codex 使用另一个工作目录的 1.6.0 主题。本仓库 1.5.18 的实机验证因版本与 payload revision 不匹配而失败，不能据此宣称本次首页与任务页视觉验收通过。未覆盖当前应用中的 1.6.0，也未强制关闭或替换它。

本次没有在第二台全新电脑上完成从退出 Codex到重新启动的端到端安装，也没有构建或发布正式安装器。新电脑安装完成后，仍应按 `docs/install-with-codex.md` 检查受管状态和首页、任务页外观；官方应用更新导致兼容性变化时，应保留具体失败信息。
