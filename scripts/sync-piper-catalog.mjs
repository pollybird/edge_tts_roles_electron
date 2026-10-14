#!/usr/bin/env node
/**
 * 同步 Piper 语音模型目录（catalog.ts）与上游 voices.json。
 *
 * 数据源：rhasspy/piper-voices 仓库 voices.json（main 分支）。
 *   - hf-mirror.com 优先（大陆可达），huggingface.co 回退；
 *   - --proxy socks-host:port 时 huggingface 走 curl --socks5-hostname。
 *
 * 选择规则：每个语言族（language.family）精选一个模型——
 *   - zh/en/de 人工指定旗舰声（huayan/lessac/thorsten，优先 medium 档）；
 *   - 其余语言族按质量优先级 medium > high > low > x_low，同级按 voice_id
 *     升序取首个（如 kk 无 medium，自动取 high 档 issai）。
 *
 * edgePrefixes 为人工维护的「该模型匹配哪些 Edge 音色前缀」映射，无法从上游
 * 自动推导（Edge 与 Piper 语种覆盖不同：如 Piper 的 ar_JO 对应 Edge 的 ar-SA/ar-EG）。
 * 脚本以现有 catalog.ts 中的 edgePrefixes 为基准：仅当某族选中 voice_id 未变时
 * 沿用旧值；voice_id 变化或新增族时回退默认值（[<code 横线化>, <family>]）并
 * 输出告警提示人工复核。
 *
 * sizeMB 取 voices.json files 中 .onnx 条目的 size_bytes（权威值，无体积漂移）；
 * md5Digest、numSpeakers 同取自 voices.json（分别用于下载完整性校验与多说话人支持）。
 *
 * 用法：
 *   node scripts/sync-piper-catalog.mjs              # 生成并写盘（内容变化才写）
 *   node scripts/sync-piper-catalog.mjs --dry-run    # 输出 diff 不写盘
 *   node scripts/sync-piper-catalog.mjs --check      # CI：检测过时，退出码 0/1
 *   node scripts/sync-piper-catalog.mjs --proxy 127.0.0.1:1081
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const CATALOG_PATH = join(ROOT, 'src/main/tts/piper/catalog.ts')
const VOICES_URLS = [
  'https://hf-mirror.com/rhasspy/piper-voices/raw/main/voices.json',
  'https://huggingface.co/rhasspy/piper-voices/raw/main/voices.json'
]

const dryRun = process.argv.includes('--dry-run')
const check = process.argv.includes('--check')
const proxyIdx = process.argv.indexOf('--proxy')
const proxy = proxyIdx > -1 ? process.argv[proxyIdx + 1] : null

// zh/en/de 人工指定旗舰声（voiceName → 匹配 voices.json 的 name 字段）
const FLAGSHIP = {
  zh: 'huayan',
  en: 'lessac',
  de: 'thorsten'
}
// 质量优先级
const QUAL_RANK = { medium: 0, high: 1, low: 2, x_low: 3 }

/**
 * 拉取 voices.json：先试 Node fetch（hf-mirror 直连），失败且配 --proxy 时用 curl。
 */
async function fetchVoicesJson() {
  // 直连尝试（hf-mirror 优先，huggingface 回退）
  for (const url of VOICES_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (res.ok) {
        const text = await res.text()
        JSON.parse(text) // 校验可解析
        console.error(`✓ 已拉取 voices.json ← ${url}`)
        return text
      }
      console.error(`  ${url} 返回 HTTP ${res.status}`)
    } catch (err) {
      console.error(`  ${url} 不可达：${err.message}`)
    }
  }
  // 回退 curl --socks5-hostname（仅当 --proxy 指定）
  if (proxy) {
    const url = VOICES_URLS[VOICES_URLS.length - 1] // huggingface 走代理
    console.error(`  尝试 curl --socks5-hostname ${proxy} ← ${url}`)
    const res = spawnSync('curl', ['-sSL', '--max-time', '120', '--socks5-hostname', proxy, url], {
      encoding: 'utf8'
    })
    if (res.status === 0 && res.stdout) {
      JSON.parse(res.stdout)
      console.error(`✓ 已拉取 voices.json ← ${url}（via socks ${proxy}）`)
      return res.stdout
    }
    throw new Error(`curl 经代理拉取失败（exit ${res.status}）`)
  }
  throw new Error('所有 voices.json 来源均不可达；加 --proxy socks-host:port 后重试')
}

/**
 * 解析现有 catalog.ts，提取每个 voice id 的 edgePrefixes（人工维护基准）。
 * 返回 Map<voiceId, string[]>。
 */
function parseExistingEdgePrefixes() {
  const map = new Map()
  if (!existsSync(CATALOG_PATH)) return map
  const src = readFileSync(CATALOG_PATH, 'utf8')
  const re = /id:\s*'([^']+)'[\s\S]*?edgePrefixes:\s*\[([^\]]*)\]/g
  let m
  while ((m = re.exec(src)) !== null) {
    const id = m[1]
    const arrRaw = m[2].trim()
    const prefixes = arrRaw
      ? arrRaw.split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
      : []
    map.set(id, prefixes)
  }
  return map
}

/**
 * 应用选择规则：每族选一个模型。
 * zh/en/de 取旗舰声的 medium 档（无 medium 退到下一质量档）；
 * 其余族按质量优先级 + voice_id 升序取首个。
 */
function selectVoices(voices) {
  const byFamily = new Map()
  for (const [id, def] of Object.entries(voices)) {
    const fam = def.language.family
    if (!byFamily.has(fam)) byFamily.set(fam, [])
    byFamily.get(fam).push({ id, ...def })
  }
  const selected = []
  for (const [fam, list] of [...byFamily.entries()].sort()) {
    let pick
    const flagship = FLAGSHIP[fam]
    if (flagship) {
      // 旗舰声：优先 medium，再按质量档降级，仍无则取该 name 的任意一档
      const named = list.filter((v) => v.name === flagship)
      named.sort((a, b) => QUAL_RANK[a.quality] - QUAL_RANK[b.quality])
      pick = named[0]
    }
    if (!pick) {
      pick = [...list].sort(
        (a, b) => QUAL_RANK[a.quality] - QUAL_RANK[b.quality] || a.id.localeCompare(b.id)
      )[0]
    }
    selected.push({ family: fam, ...pick })
  }
  return selected
}

/** 从 voices.json 的 files 映射提取 .onnx 文件元信息 */
function onnxFileInfo(def) {
  const onnxKey = Object.keys(def.files).find((k) => k.endsWith('.onnx') && !k.endsWith('.onnx.json'))
  if (!onnxKey) throw new Error(`voice ${def.id} 缺少 .onnx 文件条目`)
  const f = def.files[onnxKey]
  return {
    path: onnxKey.replace(/\.onnx$/, ''),
    sizeBytes: f.size_bytes ?? 0,
    md5Digest: f.md5_digest ?? undefined
  }
}

/**
 * 生成 catalog.ts 源码字符串。
 */
function buildCatalogSource(selected, existingPrefixes, syncTime, upstreamCommit) {
  const entries = selected.map((v) => {
    const info = onnxFileInfo(v)
    const sizeMB = Math.round(info.sizeBytes / 1048576)
    // edgePrefixes：沿用旧值（voice_id 未变），否则回退默认 + 告警
    let prefixes = existingPrefixes.get(v.id)
    let review = false
    if (!prefixes) {
      const codeHyphen = v.language.code.replace('_', '-')
      prefixes = [codeHyphen, v.family]
      review = true
    }
    const fields = [
      `    id: '${v.id}'`,
      `    path: '${info.path}'`,
      `    sizeMB: ${sizeMB}`,
      `    quality: '${v.quality}'`,
      `    voiceName: '${v.name}'`,
      `    langName: '${v.language.name_native}'`,
      `    edgePrefixes: [${prefixes.map((p) => `'${p}'`).join(', ')}]`
    ]
    if (info.md5Digest) fields.push(`    md5Digest: '${info.md5Digest}'`)
    if (v.num_speakers && v.num_speakers > 1)
      fields.push(`    numSpeakers: ${v.num_speakers}`)
    if (review) fields.unshift('    // ⚠ edgePrefixes 为自动回退默认值，请人工复核')
    // join 用 ',\n'：逗号仅出现在字段之间，末字段无尾逗号（符合 trailingComma:none）
    return `  {\n${fields.join(',\n')}\n  }`
  })
  const header = `/**
 * Piper 官方语音模型目录（多语言）。
 *
 * 数据来源：rhasspy/piper-voices 仓库 voices.json（main 分支），
 * 由 scripts/sync-piper-catalog.mjs 自动生成——请勿手工编辑本文件，
 * 修改选择规则或 edgePrefixes 请改同步脚本后重新运行 npm run sync:piper。
 * 上游同步时间：${syncTime}${
    upstreamCommit ? `（commit ${upstreamCommit.slice(0, 12)}）` : ''
  }。
 * 每个语言族精选一个模型（优先 medium 质量；zh/en/de 为人工指定旗舰声
 * huayan/lessac/thorsten；kk 无 medium 自动取 high 档 issai）。
 * langName 为语言原生名（endonym）、voiceName 为模型原生名——二者均为
 * 官方目录中的专有数据，与界面语言无关，故不进 i18n 语言包（Edge 语音
 * 目录的本地化约束不适用于此：官方未提供 53 种语言的本地化名）。
 */`
  const iface = `export interface PiperVoiceDef {
  /** 模型 ID，如 zh_CN-huayan-medium */
  id: string
  /** HF 仓库内相对路径（不带 .onnx / .onnx.json 后缀） */
  path: string
  /** 模型大约体积（MB，来自 voices.json 的 size_bytes，用于 UI 展示与下载下限校验） */
  sizeMB: number
  /** 质量档位（x_low / low / medium / high） */
  quality: string
  /** 模型原生名（voices.json 的 name 字段，如 huayan） */
  voiceName: string
  /** 语言原生名（voices.json 的 language.name_native，如 简体中文） */
  langName: string
  /** 匹配的 Edge 音色语言前缀（zh-CN / en-US 等） */
  edgePrefixes: string[]
  /** .onnx 文件 MD5 摘要（来自 voices.json，用于下载完整性校验；缺省时回退体积+魔数校验） */
  md5Digest?: string
  /** 说话人数量（来自 voices.json 的 num_speakers，>1 为多说话人模型，默认合成 speaker 0） */
  numSpeakers?: number
}`
  const arr = `export const PIPER_VOICES: PiperVoiceDef[] = [
${entries.join(',\n')}
]`
  return `${header}\n\n${iface}\n\n${arr}\n`
}

/** 用项目 prettier 配置格式化（保证 diff 干净） */
async function formatWithPrettier(code) {
  try {
    const prettier = await import('prettier')
    const cfg = await prettier.resolveConfig(CATALOG_PATH)
    return await prettier.format(code, { parser: 'typescript', ...cfg, filepath: CATALOG_PATH })
  } catch (err) {
    console.error(`  （prettier 不可用，跳过格式化：${err.message}）`)
    return code
  }
}

/** 获取上游 commit hash（hf-mirror / HF 的 raw 接口返回 x-revision 头） */
async function fetchUpstreamCommit() {
  for (const url of VOICES_URLS) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
      const rev = res.headers.get('x-revision') || res.headers.get('x-linked-revision')
      if (rev) return rev
    } catch {
      // 忽略
    }
  }
  return null
}

function diffSummary(oldSrc, newSrc) {
  const oldLines = oldSrc.split('\n')
  const newLines = newSrc.split('\n')
  const added = newLines.filter((l) => !oldLines.includes(l)).length
  const removed = oldLines.filter((l) => !newLines.includes(l)).length
  return `+${added} / -${removed} 行变化`
}

/**
 * 抹除「上游同步时间」行的具体日期值，仅保留结构。
 * 避免 --check 因同步日期（今日 vs 昨日）误报目录过时——真正有意义的是
 * voice 数据是否变化，而非上次同步是哪天。
 */
function normalizeForCompare(src) {
  return src.replace(/ \* 上游同步时间：[^\n]*\n/, ' * 上游同步时间：\n')
}

async function main() {
  const existingPrefixes = parseExistingEdgePrefixes()
  console.error(`现有 catalog 已记录 ${existingPrefixes.size} 条 edgePrefixes 基准`)

  const rawJson = await fetchVoicesJson()
  const voices = JSON.parse(rawJson)
  console.error(`voices.json 含 ${Object.keys(voices).length} 个模型`)

  const upstreamCommit = await fetchUpstreamCommit()
  const syncTime = new Date().toISOString().slice(0, 10)
  const selected = selectVoices(voices)
  console.error(`按规则选出 ${selected.length} 个语言族代表模型`)

  // 告警：voice_id 变化或新增（edgePrefixes 无基准 → 回退默认）
  const reviewNeeded = selected.filter((v) => !existingPrefixes.has(v.id))
  if (reviewNeeded.length) {
    console.error('⚠ 以下 voice_id 无既有 edgePrefixes，已回退默认值请复核：')
    for (const v of reviewNeeded) console.error(`  ${v.id}（${v.family}）`)
  }

  let source = buildCatalogSource(selected, existingPrefixes, syncTime, upstreamCommit)
  source = await formatWithPrettier(source)

  const existingSrc = existsSync(CATALOG_PATH)
    ? readFileSync(CATALOG_PATH, 'utf8')
    : ''

  // 比较时抹除同步日期行：仅 voice 数据变化才算过时，避免日期日变化误报
  if (normalizeForCompare(source) === normalizeForCompare(existingSrc)) {
    console.error('✓ catalog.ts 已与上游一致，无需更新')
    if (check) process.exit(0)
    return
  }

  if (check) {
    console.error('✗ catalog.ts 与上游不同步（' + diffSummary(existingSrc, source) + '）')
    console.error('  运行 `npm run sync:piper` 更新')
    process.exit(1)
  }

  if (dryRun) {
    console.error('（--dry-run）不写盘。' + diffSummary(existingSrc, source))
    process.stdout.write('\n========== 生成的 catalog.ts ==========\n')
    process.stdout.write(source)
    return
  }

  writeFileSync(CATALOG_PATH, source, 'utf8')
  console.error(`✓ 已更新 ${CATALOG_PATH}（${diffSummary(existingSrc, source)}）`)
}

main().catch((err) => {
  console.error('同步失败：', err)
  process.exit(1)
})
