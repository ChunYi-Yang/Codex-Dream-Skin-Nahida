# 贡献指南

感谢你改进 Codex Dream Skin Nahida。本仓库仅支持 Windows，通过本机回环
CDP 为官方 Codex 桌面端加载外部主题。

## 开始前

1. 阅读[项目 README](../README.md)、[Windows 使用说明](../windows/README.md)
   和[实现约束](../windows/SKILL.md)。
2. 搜索[现有 Issue](https://github.com/447662/Codex-Dream-Skin-Nahida/issues)
   与[开放 PR](https://github.com/447662/Codex-Dream-Skin-Nahida/pulls)。
3. 从最新 `main` 创建分支，一个 PR 只解决一个明确问题。

## 开发与验证

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\run-tests.ps1

powershell.exe -NoProfile -ExecutionPolicy RemoteSigned `
  -File .\windows\tests\installer-static.tests.ps1
```

修改注入、CSS、安装、启动或恢复流程时，还要运行对应脚本与
`windows/scripts/verify-dream-skin.ps1`，并检查首页和普通任务页。

## 约束

- PowerShell、JavaScript、JSON、YAML 和 CSS 使用两个空格缩进；Node 使用 ESM。
- CDP 只能绑定本机回环地址。
- 不修改 WindowsApps、`app.asar`、官方二进制、签名、API Key 或 Base URL。
- `config.toml` 必须严格按 UTF-8 读取、原子写入并保留可恢复备份。
- 不提交日志、构建产物、本机运行目录、密钥、私人对话或未经处理的个人截图。
- 用户可见改动更新 `windows/CHANGELOG.md`；只有明确发版时才修改 `windows/VERSION`。

提交信息优先使用 `type(scope): summary`，例如
`fix(windows): preserve UTF-8 config on restore`。PR 中只填写实际完成的测试；
视觉改动应附首页和任务页截图，并清除私人内容。
