# Windows 运行模型与路径

## 运行模型

```text
Codex Dream Skin
    │  启动官方 Store Codex + 本机回环 CDP
    ▼
官方 Codex Desktop（不改 WindowsApps / app.asar / 签名）
    │  注入 CSS + 只读装饰 DOM
    ▼
原生侧栏 / 输入框 / 任务菜单 + 纳西妲主题层
```

本仓库仅支持 Windows。历史 macOS 实现已经移除，Windows 脚本不再依赖任何
macOS 文件、版本号或构建产物。

## 路径速查

| 用途 | 路径 |
|------|------|
| 源码 | `Codex-Dream-Skin-Nahida/windows/` |
| 安装目录 | `%LOCALAPPDATA%\Programs\CodexDreamSkin` |
| 受管运行时 | `%LOCALAPPDATA%\CodexDreamSkin\engine` |
| 当前主题 | `%LOCALAPPDATA%\CodexDreamSkin\active-theme` |
| 已保存主题 | `%LOCALAPPDATA%\CodexDreamSkin\themes` |
| 导入图片 | `%LOCALAPPDATA%\CodexDreamSkin\images` |
| 状态与日志 | `%LOCALAPPDATA%\CodexDreamSkin` |
| Codex 配置 | `%USERPROFILE%\.codex\config.toml` |
| 默认 CDP 端口 | 首选 `9335`，冲突时自动选择可用端口 |

## 能力

| 功能 | 状态 |
|------|:----:|
| 安装器与源码安装 | ✅ |
| 启动、注入与登录自启 | ✅ |
| 纳西妲分层主题 | ✅ |
| 更换背景、保存与切换主题 | ✅ |
| DreamSkin.cc 一键换肤与 ZIP 导入 | ✅ |
| 实机 Verify 与截图 | ✅ |
| 暂停、恢复和卸载前恢复 | ✅ |
| Store 包身份、进程与回环端口校验 | ✅ |

## 不应进入仓库的内容

- `%LOCALAPPDATA%\CodexDreamSkin` 的安装副本、状态与日志；
- `auth.json`、`.env`、`config.toml`、API Key、令牌或代理凭据；
- 构建产物、临时 ZIP、下载缓存和个人素材原图；
- 含私人对话、用户名路径或凭据的实机截图。
