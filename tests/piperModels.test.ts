import { describe, expect, it, vi } from 'vitest'
import {
  PIPER_MIRRORS,
  PIPER_VOICES,
  PiperModelManager,
  resolvePiperVoiceId,
  voiceDownloadUrl,
  type PiperVoiceDef
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

  /** 构造分片式 ReadableStream（避免整体读入内存），fetch stub 复用 */
  function chunkedStream(buf: Buffer, chunkSize = 64 * 1024): ReadableStream<Uint8Array> {
    let pos = 0
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pos >= buf.length) controller.close()
        else {
          const end = Math.min(pos + chunkSize, buf.length)
          controller.enqueue(buf.subarray(pos, end))
          pos = end
        }
      }
    })
  }

  /** 选目录最小模型，构造全 0x01 的假响应体及其 md5（注入到夹具 voice 上） */
  async function makeFakeVoice(): Promise<{
    voice: PiperVoiceDef
    content: Buffer
    need: number
  }> {
    const { createHash } = await import('crypto')
    const voice = [...PIPER_VOICES].sort((a, b) => a.sizeMB - b.sizeMB)[0]
    const need = Math.ceil((voice.sizeMB / 2) * 1024 * 1024)
    const content = Buffer.alloc(need, 1)
    const md5 = createHash('md5').update(content).digest('hex')
    return { voice: { ...voice, md5Digest: md5 }, content, need }
  }

  it('download 落盘为单扩展名 <id>.onnx 且通过 md5 完整性校验（回归：曾写成 <id>.onnx.onnx）', async () => {
    const os = await import('os')
    const { mkdtemp, readdir, rm } = await import('fs/promises')
    const dir = await mkdtemp(os.tmpdir() + '/piper-dl-')
    const mgr = new PiperModelManager(dir)
    const { voice, content, need } = await makeFakeVoice()
    vi.spyOn(mgr, 'byId').mockReturnValue(voice)
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(chunkedStream(content), {
          status: 200,
          headers: { 'content-length': String(need) }
        })
      )
    )
    try {
      await mgr.download(voice.id)
      const files = await readdir(dir)
      expect(files).toContain(`${voice.id}.onnx`)
      expect(files).toContain(`${voice.id}.onnx.json`)
      // 无 .part 残留、无双扩展名
      expect(files.some((f) => f.endsWith('.part'))).toBe(false)
      expect(files.some((f) => f.endsWith('.onnx.onnx'))).toBe(false)
      expect(await mgr.isDownloaded(voice.id)).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('断点续传：.part 残留从断点继续，最终文件完整且 md5 匹配', async () => {
    const os = await import('os')
    const { createHash } = await import('crypto')
    const { mkdtemp, readdir, rm, stat, writeFile } = await import('fs/promises')
    const dir = await mkdtemp(os.tmpdir() + '/piper-resume-')
    const mgr = new PiperModelManager(dir)
    // 全量内容（全 0x42）与对应 md5
    const voice = [...PIPER_VOICES].sort((a, b) => a.sizeMB - b.sizeMB)[0]
    const need = Math.ceil((voice.sizeMB / 2) * 1024 * 1024)
    const full = Buffer.alloc(need, 0x42)
    const md5 = createHash('md5').update(full).digest('hex')
    const fakeVoice = { ...voice, md5Digest: md5 }
    vi.spyOn(mgr, 'byId').mockReturnValue(fakeVoice)
    // 预置 .onnx.part 半截（前半），.onnx.json 无残留走全量
    const half = Math.floor(full.length / 2)
    await writeFile(`${mgr.modelPath(voice.id)}.part`, full.subarray(0, half))
    // fetch：json 全量 200；onnx 带 Range 时返 206 + content-range + 后半段
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      const range = (init?.headers as Record<string, string> | undefined)?.Range
      if (u.endsWith('.onnx.json')) {
        return Promise.resolve(
          new Response(chunkedStream(full), {
            status: 200,
            headers: { 'content-length': String(full.length) }
          })
        )
      }
      // .onnx
      if (range) {
        const start = Number(/bytes=(\d+)-/.exec(range)![1])
        const rest = full.subarray(start)
        return Promise.resolve(
          new Response(chunkedStream(rest), {
            status: 206,
            headers: {
              'content-length': String(rest.length),
              'content-range': `bytes ${start}-${full.length - 1}/${full.length}`
            }
          })
        )
      }
      return Promise.resolve(
        new Response(chunkedStream(full), {
          status: 200,
          headers: { 'content-length': String(full.length) }
        })
      )
    })
    try {
      await mgr.download(voice.id)
      const files = await readdir(dir)
      expect(files).toContain(`${voice.id}.onnx`)
      // 断点续传后最终文件大小 = 全量
      expect((await stat(mgr.modelPath(voice.id))).size).toBe(full.length)
      expect(files.some((f) => f.endsWith('.part'))).toBe(false)
    } finally {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('md5 不匹配时拒绝下载且不留最终文件', async () => {
    const os = await import('os')
    const { mkdtemp, readdir, rm } = await import('fs/promises')
    const dir = await mkdtemp(os.tmpdir() + '/piper-badmd5-')
    const mgr = new PiperModelManager(dir)
    const { voice, content, need } = await makeFakeVoice()
    // 注入错误的 md5，使校验必失败
    const badVoice = { ...voice, md5Digest: 'deadbeef'.repeat(4) }
    vi.spyOn(mgr, 'byId').mockReturnValue(badVoice)
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(chunkedStream(content), {
          status: 200,
          headers: { 'content-length': String(need) }
        })
      )
    )
    try {
      await expect(mgr.download(voice.id)).rejects.toThrow('md5 mismatch')
      const files = await readdir(dir)
      // 最终文件不应存在（仅可能留 .part）
      expect(files).not.toContain(`${voice.id}.onnx`)
      expect(await mgr.isDownloaded(voice.id)).toBe(false)
    } finally {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('remove 一并清理 .part 残留', async () => {
    const os = await import('os')
    const { mkdtemp, writeFile, rm, readdir } = await import('fs/promises')
    const dir = await mkdtemp(os.tmpdir() + '/piper-rm-')
    const mgr = new PiperModelManager(dir)
    const id = PIPER_VOICES[0].id
    await writeFile(`${mgr.modelPath(id)}.part`, 'partial')
    await writeFile(`${mgr.configPath(id)}.part`, 'partial')
    await mgr.remove(id)
    const files = await readdir(dir)
    expect(files.some((f) => f.endsWith('.part'))).toBe(false)
    await rm(dir, { recursive: true, force: true })
  })
})
