import { describe, expect, it, vi } from 'vitest'
import {
  PIPER_MIRRORS,
  PIPER_VOICES,
  PiperModelManager,
  resolvePiperVoiceId,
  voiceDownloadUrl
} from '../src/main/tts/piper/models'

describe('voiceDownloadUrl', () => {
  it('按镜像与模型路径拼接 .onnx 与 .onnx.json 地址', () => {
    const voice = PIPER_VOICES.find((v) => v.id === 'zh_CN-huayan-medium')!
    expect(voiceDownloadUrl('https://hf-mirror.com', voice, '.onnx')).toBe(
      'https://hf-mirror.com/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx'
    )
    expect(voiceDownloadUrl('https://huggingface.co', voice, '.onnx.json')).toBe(
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json'
    )
  })

  it('镜像列表：hf-mirror.com 优先、官方 HF 回退', () => {
    expect(PIPER_MIRRORS[0]).toBe('https://hf-mirror.com')
    expect(PIPER_MIRRORS).toContain('https://huggingface.co')
  })
})

describe('resolvePiperVoiceId', () => {
  it('中文 Edge 音色映射到 huayan 模型', () => {
    expect(resolvePiperVoiceId('zh-CN-XiaoxiaoNeural')).toBe('zh_CN-huayan-medium')
    expect(resolvePiperVoiceId('zh-CN-YunxiNeural')).toBe('zh_CN-huayan-medium')
  })

  it('英文 Edge 音色映射到 lessac 模型', () => {
    expect(resolvePiperVoiceId('en-US-AriaNeural')).toBe('en_US-lessac-medium')
    expect(resolvePiperVoiceId('en-GB-SoniaNeural')).toBe('en_US-lessac-medium')
  })

  it('长前缀优先于短前缀（zh-CN 优先于 zh）', () => {
    // zh-CN-* 同时命中 zh_CN-huayan-medium 的 'zh-CN' 与 'zh' 前缀，应返回该唯一中文模型
    expect(resolvePiperVoiceId('zh-CN-XiaoxiaoNeural')).toBe('zh_CN-huayan-medium')
  })

  it('无匹配语言返回 null（目录未覆盖的语言族）', () => {
    // 目录按官方 voices.json 每语言族精选一模型（含 ja/fr 等 53 族），
    // 未覆盖的语言（如南非荷兰语、马来语）才返回 null
    expect(resolvePiperVoiceId('af-ZA-AdriNeural')).toBeNull()
    expect(resolvePiperVoiceId('ms-MY-YasminNeural')).toBeNull()
    expect(resolvePiperVoiceId('')).toBeNull()
  })
})

describe('PiperModelManager', () => {
  it('注入 baseDir 时模型路径按目录推导', () => {
    const mgr = new PiperModelManager('/tmp/test-piper-voices')
    expect(mgr.modelDir()).toBe('/tmp/test-piper-voices')
    expect(mgr.modelPath('zh_CN-huayan-medium')).toBe(
      '/tmp/test-piper-voices/zh_CN-huayan-medium.onnx'
    )
    expect(mgr.configPath('zh_CN-huayan-medium')).toBe(
      '/tmp/test-piper-voices/zh_CN-huayan-medium.onnx.json'
    )
  })

  it('byId 返回定义；未知 id 返回 null', () => {
    const mgr = new PiperModelManager('/tmp/test-piper-voices')
    expect(mgr.byId('zh_CN-huayan-medium')?.path).toBe('zh/zh_CN/huayan/medium/zh_CN-huayan-medium')
    expect(mgr.byId('nonexistent')).toBeNull()
  })

  it('未下载的模型 isDownloaded 为 false；下载后为 true（使用临时目录）', async () => {
    const os = await import('os')
    const dir = os.tmpdir() + `/piper-test-${Date.now()}`
    await (await import('fs/promises')).mkdir(dir, { recursive: true })
    const mgr = new PiperModelManager(dir)
    const id = PIPER_VOICES[0].id
    expect(await mgr.isDownloaded(id)).toBe(false)
    // 写入占位文件模拟已下载
    const { writeFile } = await import('fs/promises')
    await writeFile(mgr.modelPath(id), 'fake')
    expect(await mgr.isDownloaded(id)).toBe(true)
    await mgr.remove(id)
    expect(await mgr.isDownloaded(id)).toBe(false)
  })

  it('未知 id 下载抛错', async () => {
    const mgr = new PiperModelManager('/tmp/test-piper-voices')
    await expect(mgr.download('nonexistent')).rejects.toThrow('unknown piper voice')
  })

  it('download 落盘为单扩展名 <id>.onnx（回归：曾写成 <id>.onnx.onnx 导致 isDownloaded 永远 false）', async () => {
    const os = await import('os')
    const { mkdtemp, readdir, rm } = await import('fs/promises')
    const dir = await mkdtemp(os.tmpdir() + '/piper-dl-')
    const mgr = new PiperModelManager(dir)
    // 选目录中最小的模型，使假响应体刚好越过「体积下限」门槛即可
    const voice = [...PIPER_VOICES].sort((a, b) => a.sizeMB - b.sizeMB)[0]
    const need = Math.ceil((voice.sizeMB / 2) * 1024 * 1024)
    vi.stubGlobal('fetch', () => {
      let served = 0
      const chunk = new Uint8Array(64 * 1024).fill(1)
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (served >= need) controller.close()
          else {
            controller.enqueue(chunk)
            served += chunk.length
          }
        }
      })
      return Promise.resolve(new Response(body, { status: 200 }))
    })
    try {
      await mgr.download(voice.id)
      const files = await readdir(dir)
      expect(files).toContain(`${voice.id}.onnx`)
      expect(files).toContain(`${voice.id}.onnx.json`)
      expect(files.some((f) => f.endsWith('.onnx.onnx') || f.endsWith('.onnx.onnx.json'))).toBe(
        false
      )
      expect(await mgr.isDownloaded(voice.id)).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
