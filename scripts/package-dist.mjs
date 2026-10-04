#!/usr/bin/env node
/**
 * 按架构逐个调用 electron-builder，确保每个安装包只携带匹配平台的 ffmpeg。
 *
 * 背景：electron-builder.yml 的 extraResources 是静态配置，无法在同一次
 * x64+arm64 构建中按架构区分来源目录。本脚本对每个架构：
 *   1. 把 resources/ffmpeg/<triplet> 暂存到 resources/.ffmpeg-stage/<triplet>；
 *   2. 基于 electron-builder.yml 生成临时配置，将 extraResources 指向暂存目录
 *      （electron-builder 会把 from 目录的“内容”复制到 resources/<to>）；
 *   3. 调用 electron-builder 仅构建该架构；
 *   4. 全部结束后清理暂存目录与临时配置。
 *
 * 用法：
 *   node scripts/package-dist.mjs <win|mac|linux> [target...] --x64 --arm64
 * 例：
 *   node scripts/package-dist.mjs linux AppImage deb rpm --x64 --arm64
 *   node scripts/package-dist.mjs win nsis --x64 --arm64
 *
 * 前置：先执行 npm run prepare:ffmpeg（package.json 的 pre* 钩子已自动处理）。
 */

import { spawnSync } from 'child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const FFMPEG_SRC = join(ROOT, 'resources', 'ffmpeg')
const BASE_CONFIG = join(ROOT, 'electron-builder.yml')

const [platform, ...rest] = process.argv.slice(2)
const arches = rest.filter((a) => a === '--x64' || a === '--arm64').map((a) => a.slice(2))
const targets = rest.filter((a) => !a.startsWith('--'))

if (!['win', 'mac', 'linux'].includes(platform) || arches.length === 0) {
  console.error('用法: node scripts/package-dist.mjs <win|mac|linux> [target...] --x64 [--arm64]')
  process.exit(1)
}

/**
 * 安装包内 ffmpeg 目录名 → 源二进制目录。
 * Windows ARM64 无原生 ffmpeg，包内只放 x64 二进制，由运行时回退逻辑（模拟执行）处理。
 */
function sourceTriplet(arch) {
  if (platform === 'win' && arch === 'arm64') return 'win32-x64'
  const osTriplet = { win: 'win32', mac: 'darwin', linux: 'linux' }[platform]
  return `${osTriplet}-${arch}`
}

function run(builderBin, configPath, arch) {
  const args = ['--config', configPath, `--${platform}`, ...targets, `--${arch}`]
  console.log(`\n=== electron-builder ${platform} ${targets.join(' ')} ${arch}`)
  console.log(`    ${builderBin} ${args.join(' ')}`)
  const res = spawnSync(builderBin, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  })
  if (res.status !== 0) {
    throw new Error(`electron-builder 失败（${platform} ${arch}，exit ${res.status}）`)
  }
}

const stageDir = join(ROOT, 'resources', `.ffmpeg-stage-${platform}`)
const baseYaml = yaml.load(readFileSync(BASE_CONFIG, 'utf8'))

try {
  rmSync(stageDir, { recursive: true, force: true })
  const tmpDir = mkdtempSync(join(tmpdir(), 'eb-config-'))

  for (const arch of arches) {
    const triplet = sourceTriplet(arch)
    const src = join(FFMPEG_SRC, triplet)
    if (!existsSync(src)) {
      throw new Error(`缺少 ${triplet} 的 ffmpeg，请先运行 npm run prepare:ffmpeg`)
    }

    // 暂存：resources/.ffmpeg-stage-<platform>/<triplet>/...
    // 各平台用独立目录，可安全并行构建（不互相覆盖）
    cpSync(src, join(stageDir, triplet), { recursive: true, verbatimSymlinks: true, errorOnExist: false })
    console.log(`已暂存 ffmpeg: ${triplet} → .ffmpeg-stage/${triplet}`)

    const config = {
      ...baseYaml,
      // 关键：electron-builder 会以“配置文件所在目录”作为项目根，缓存键也基于文件名
      // 用临时目录且每次名字不同，强制重读
      extraResources: [{ from: join('resources', `.ffmpeg-stage-${platform}`), to: 'ffmpeg', filter: ['**/*'] }]
    }
    const configPath = join(tmpDir, `electron-builder-${platform}-${arch}-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify(config))

    const builderBin = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')
    run(builderBin, configPath, arch)

    rmSync(stageDir, { recursive: true, force: true })
  }
} finally {
  rmSync(stageDir, { recursive: true, force: true })
}
console.log('\n全部架构打包完成。')
