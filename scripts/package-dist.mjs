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
  const args = ['--config', configPath, '--publish', 'never', `--${platform}`, ...targets, `--${arch}`]
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

/**
 * electron-builder 生成的 latest 文件命名：
 *   linux x64  → latest-linux.yml
 *   linux arm64 → latest-linux-arm64.yml
 *   win   → latest.yml（两架构同名，后者覆盖前者）
 *   mac   → latest-mac.yml（两架构同名，后者覆盖前者）
 */
function latestFileName(arch) {
  if (platform === 'win') return 'latest.yml'
  if (platform === 'mac') return 'latest-mac.yml'
  return arch === 'arm64' ? 'latest-linux-arm64.yml' : 'latest-linux.yml'
}

/** electron-updater 实际读取的主 latest 文件名 */
function primaryLatestFileName() {
  if (platform === 'win') return 'latest.yml'
  if (platform === 'mac') return 'latest-mac.yml'
  return 'latest-linux.yml'
}

const stageDir = join(ROOT, 'resources', `.ffmpeg-stage-${platform}`)
const baseYaml = yaml.load(readFileSync(BASE_CONFIG, 'utf8'))

// 收集各架构生成的 latest*.yml，最后合并为单个主 latest 文件
const collectedFiles = []
let primaryMeta = null

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
    cpSync(src, join(stageDir, triplet), {
      recursive: true,
      verbatimSymlinks: true,
      errorOnExist: false
    })
    console.log(`已暂存 ffmpeg: ${triplet} → .ffmpeg-stage/${triplet}`)

    const config = {
      ...baseYaml,
      // 关键：electron-builder 会以“配置文件所在目录”作为项目根，缓存键也基于文件名
      // 用临时目录且每次名字不同，强制重读
      extraResources: [
        { from: join('resources', `.ffmpeg-stage-${platform}`), to: 'ffmpeg', filter: ['**/*'] }
      ]
    }
    const configPath = join(tmpDir, `electron-builder-${platform}-${arch}-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify(config))

    const builderBin = join(
      ROOT,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
    )
    run(builderBin, configPath, arch)

    // 读取本次构建生成的 latest 文件，收集 files 条目
    const latestPath = join(ROOT, 'dist', latestFileName(arch))
    if (existsSync(latestPath)) {
      const data = yaml.load(readFileSync(latestPath, 'utf8'))
      if (Array.isArray(data.files)) collectedFiles.push(...data.files)
      // 以第一个（通常是 x64）的元信息作为主 latest 的 path/sha512/releaseDate
      if (primaryMeta === null) {
        primaryMeta = {
          version: data.version,
          path: data.path,
          sha512: data.sha512,
          releaseDate: data.releaseDate
        }
      }
    }

    rmSync(stageDir, { recursive: true, force: true })
  }

  // 合并所有架构的 files 到主 latest 文件
  if (collectedFiles.length > 0 && primaryMeta) {
    const primaryPath = join(ROOT, 'dist', primaryLatestFileName())
    const merged = {
      version: primaryMeta.version,
      files: collectedFiles,
      path: primaryMeta.path,
      sha512: primaryMeta.sha512,
      releaseDate: primaryMeta.releaseDate
    }
    writeFileSync(primaryPath, yaml.dump(merged, { lineWidth: -1, noRefs: true }))
    console.log(`\n已合并 latest 文件: ${primaryLatestFileName()}（${collectedFiles.length} 个产物）`)

    // linux 的 latest-linux-arm64.yml 已合并进 latest-linux.yml，删除避免混淆
    if (platform === 'linux') {
      const armPath = join(ROOT, 'dist', 'latest-linux-arm64.yml')
      if (existsSync(armPath)) rmSync(armPath)
    }
  }
} finally {
  rmSync(stageDir, { recursive: true, force: true })
}
console.log('\n全部架构打包完成。')
