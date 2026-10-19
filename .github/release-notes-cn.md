# edge-tts-roles v2.0.8

## 新功能

- **云语音服务商**：新增「设置 → 语音服务商」对话框，支持配置 **Google Cloud Text-to-Speech**、**科大讯飞**、**火山引擎（豆包语音）** 三家商用云 TTS（需用户自行申请并填入凭据，一键测试连接，每张卡片附「？」密钥申请说明）。火山采用 App ID + API Key 鉴权（v3 单向流式接口，API Key 为新版控制台签发、替代旧版 Access Token），讯飞走「语音合成（流式版）」WebSocket，Google 走 REST。启用后各服务商音色以独立分组进入发音人下拉，合成管线、磁盘缓存、字幕与附加音频混音与 Edge 音色完全一致；凭据仅存本机，仅离线模式下云音色隐藏。
- **语气标签**：新增六种语气标记 `[happy]` `[sad]` `[angry]` `[gentle]` `[excited]` `[calm]`（对应闭合标签 `[/tone]`）。语气折算为语速/音量/音调偏移叠加到角色设置，对所有引擎（Edge/Piper/云服务商）通用；可嵌套、未闭合延续到文末。编辑器工具栏新增语气下拉与「插入语气」按钮：有选区两端包裹，无选区插入成对标签并将光标置于其间；语气标签独立配色高亮。

## Bug 修复

- **修复 Edge TTS 全线合成失败**：微软已将合成服务端点迁移至 `api.msedgeservices.com`（旧端点握手返回 403），而依赖库 edge-tts-universal@1.4.0 尚未更新；本版本通过安装期补丁（patch-package）将合成端点切换到新地址，恢复正常合成。上游修复发布后将移除该补丁。

## 测试

新增 Google（7 例）/讯飞/火山（11 例）Provider 单元测试（协议帧、参数映射、错误传播、握手拒绝、停止检查），textParser 语气解析 9 例、applyTone 韵律映射 8 例，E2E 语气插入 2 例。

## 打包

- Windows 安装包（x64/arm64）现使用自签名证书做 Authenticode 签名（主程序/卸载器/安装器，SHA-256 + 可信时间戳，证书有效期至 2046 年），发布流程构建后自动校验签名。自签名无商业信任链，Windows 可能仍提示「未知发布者」；如需消除提示，可将随仓库分发的 `build/win-codesign.cer` 导入「受信任的根证书颁发机构」与「受信任的发布者」。

---

完整更新日志见 [UPGRADE_CN.md](https://gitcode.com/pollybird/edge_tts_roles_electron/blob/main/UPGRADE_CN.md)。
