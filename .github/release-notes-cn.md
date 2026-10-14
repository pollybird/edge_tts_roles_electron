# edge-tts-roles v2.0.7

## 新功能

- **诊断信息面板**：帮助菜单新增「诊断信息」，一键收集版本、平台、引擎路径、缓存占用与已下载模型列表，支持复制到剪贴板，大幅降低报障沟通成本。
- **EDGE_TTS_DEBUG 统一开关**：新增 `EDGE_TTS_DEBUG=1` 环境变量，启用后输出每段合成来源（edge/piper）与样本数；向后兼容 `EDGE_TTS_DEBUG_CUES=1`（字幕对齐调试）。

## 改进

- **离线引擎多说话人支持**：Piper 多说话人模型自动追加 `--speaker 0` 参数，目录中 12 个多说话人模型（最多 125 人）可正确合成。
- **离线引擎合成直通模式**：Piper 合成跳过 WAV 中间层编解码（`buildWav → writeFile → readFile → decodeAudioToPcm` 往返），直接返回原始 PCM 由调用方转换，减少 I/O 开销。
- **Piper 目录自动化**：新增 `scripts/sync-piper-catalog.mjs` 脚本，从官方 `rhasspy/piper-voices` 仓库拉取 `voices.json` 自动生成 `catalog.ts`，支持 `--dry-run` 与 `--check` 模式，体积与说话人数量实时查询。
- **Piper 模型下载加固**：支持断点续传（`.part` + Range 请求 + 失败回退）与完整性校验（MD5 优先、魔数回退），进度条实时显示续传状态；删除模型时清理 `.part` 残留。
- **audioProcessor 模块拆分**：将 272 行单文件拆分为 `audioProcessor/` 目录（`index.ts` 统一导出 + `types.ts` 类型 + `pcmOps.ts` 纯 PCM 运算 + `ffmpegOps.ts` ffmpeg 编解码），对外导入路径不变。
- **离线策略 E2E 与单元测试覆盖**：新增 3 个 E2E 用例（仅离线无模型提示、仅离线合成报错、仅在线列出 Edge 语音）与 10 个 vitest 集成用例（Piper maxAttempts=1、Edge 重试 15 次、缓存键引擎维度隔离），data-testid 选择器基础设施同步就位。

## 测试

11 个测试文件、157 个用例全部通过（新增 pcmFromS16le 转换、Piper `--speaker` 参数、synthesizeRaw 直通模式、audioProcessor 边界用例）。

---

完整更新日志见 [UPGRADE_CN.md](https://gitcode.com/pollybird/edge_tts_roles_electron/blob/main/UPGRADE_CN.md)。
