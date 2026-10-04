#!/usr/bin/env node
/**
 * 下载跨平台打包所需的全部 ffmpeg 二进制（与 ffmpeg-static 同源、同版本）。
 *
 * 背景：ffmpeg-static 的 postinstall 只下载“当前平台”的单个二进制，无法用于
 * 跨平台打包。本脚本把所有目标平台二进制下载到 resources/ffmpeg/，由
 * electron-builder 的 extraResources 打入安装包，运行时由
 * src/main/ffmpegResolver.ts 按 process.platform/arch 选择。
 *
 * 下载源（可用 FFMPEG_BINARIES_URL 覆盖）：
 *   1. GitHub releases（默认）
 *   2. npmmirror 二进制镜像（GitHub 失败时自动回退）
 *
 * 用法：node scripts/download-ffmpeg-binaries.mjs [--force]
 * 已存在且非空的二进制默认跳过，--force 强制重新下载。
 */

import { gunzipSync } from 'zlib'
import { chmodSync, existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const RELEASE = 'b6.1.1' // 与 ffmpeg-static 的 binary-release-tag 保持一致
const MIRRORS = [
  process.env.FFMPEG_BINARIES_URL,
  'https://github.com/eugeneware/ffmpeg-static/releases/download',
  'https://registry.npmmirror.com/-/binary/ffmpeg-static'
].filter(Boolean)

// ffmpeg-static b6.1.1 官方提供的目标；win32-arm64 无原生构建（运行时回退 x64 模拟）
const TARGETS = [
  { platform: 'linux', arch: 'x64' },
  { platform: 'linux', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'darwin', arch: 'arm64' }
]

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const OUT_ROOT = join(ROOT, 'resources', 'ffmpeg')
const force = process.argv.includes('--force')

async function fetchWithFallback(relativeUrl) {
  let lastErr
  for (const base of MIRRORS) {
    const url = `${base}/${RELEASE}/${relativeUrl}`
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      console.warn(`  ! 获取失败 ${url}: ${err.message}`)
    }
  }
  throw lastErr ?? new Error(`所有下载源均不可用：${relativeUrl}`)
}

async function downloadTarget({ platform, arch }) {
  const triplet = `${platform}-${arch}`
  const dir = join(OUT_ROOT, triplet)
  const exeName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const binPath = join(dir, exeName)

  mkdirSync(dir, { recursive: true })

  if (!force && existsSync(binPath) && statSync(binPath).size > 0) {
    console.log(`= 跳过 ${triplet}（已存在，使用 --force 可重下）`)
  } else {
    process.stdout.write(`> 下载 ffmpeg ${triplet} ... `)
    const gz = await fetchWithFallback(`ffmpeg-${platform}-${arch}.gz`)
    const buf = gunzipSync(gz)
    writeFileSync(binPath, buf)
    if (platform !== 'win32') chmodSync(binPath, 0o755)
    console.log(`OK (${(buf.length / 1024 / 1024).toFixed(1)} MB)`)
  }

  // 随二进制分发对应的许可证文本（GPL 合规：保留原始许可声明）
  const licensePath = join(dir, 'LICENSE')
  if (!existsSync(licensePath)) {
    try {
      const license = await fetchWithFallback(`${platform}-${arch}.LICENSE`)
      writeFileSync(licensePath, license)
      console.log('  · 已附带 LICENSE')
    } catch (err) {
      console.warn(`  ! LICENSE 获取失败：${err.message}（请确保根目录 LICENSE 已分发）`)
    }
  }
}

;(async () => {
  console.log(`准备 ffmpeg 二进制（release ${RELEASE}）→ ${OUT_ROOT}`)
  for (const target of TARGETS) {
    await downloadTarget(target)
  }
  console.log('完成。')
})().catch((err) => {
  console.error('\n下载失败：', err.message)
  console.error('可重试，或手动设置 FFMPEG_BINARIES_URL=<镜像地址> 后再次运行。')
  process.exit(1)
})
