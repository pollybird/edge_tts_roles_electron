# edge-tts-roles v2.0.9

## 安全

- **云服务商凭据落盘加密**：三家云服务商（Google / 讯飞 / 火山）的 API Key、App ID、API Secret 等敏感凭据，现通过 Electron `safeStorage`（系统钥匙串）加密后再写入本地配置文件，不再明文存储。加解密对上层透明，UI 与 Provider 内存中仍是明文；系统钥匙串不可用时自动回退明文，历史明文数据可无缝迁移。

## 工程

- **macOS 安装包改为 dmg**：macOS 产物由便携 `.zip` 改为 `.dmg` 磁盘镜像（支持「拖入 /Applications」安装）。由于 DMG 依赖 macOS 工具链，CI 的 macOS 构建现运行在 `macos-latest` runner，Linux runner 仅负责 Linux + Windows 构建。
- **清理误装依赖**：移除 `dependencies` 中未被使用的 `build` 包，避免与 `build/` 目录（代码签名证书）混淆。

---

完整更新日志见 [UPGRADE_CN.md](https://gitcode.com/pollybird/edge_tts_roles_electron/blob/main/UPGRADE_CN.md)。
