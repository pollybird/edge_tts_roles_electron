#!/usr/bin/env node
/**
 * 下载各平台 piper 静态二进制（rhasspy/piper release 2023.11.14-2），
 * 整理为 resources/piper/<triplet>/ 的统一布局供 electron-builder 打包：
 *   piper(.exe) + espeak-ng-data/ + 运行库（.so / .dll）
 * triplet 与 ffmpeg 分发保持一致：
 *   linux-x64 / linux-arm64 / darwin-x64 / darwin-arm64 / win32-x64
 * （win32-arm64 无官方构建，打包时复用 win32-x64 由系统模拟层运行，与 ffmpeg 同例）
 *
 * 用法：node scripts/download-piper-binaries.mjs [--proxy socks-host:port]
 *   --proxy 传给 curl --socks5-hostname（大陆网络访问 GitHub 需要）。
 * 已存在的 triplet 目录跳过（幂等，可重复执行）。
 */
import { spawnSync } from 'child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DEST = join(ROOT, 'resources', 'piper')
const VERSION = '2023.11.14-2'
const BASE = `https://github.com/rhasspy/piper/releases/download/${VERSION}`

const TRIPLETS = [
  { triplet: 'linux-x64', archive: 'piper_linux_x86_64.tar.gz', type: 'tar', inner: 'piper', bin: 'piper' },
  { triplet: 'linux-arm64', archive: 'piper_linux_aarch64.tar.gz', type: 'tar', inner: 'piper', bin: 'piper' },
  { triplet: 'darwin-x64', archive: 'piper_macos_x64.tar.gz', type: 'tar', inner: 'piper', bin: 'piper' },
  { triplet: 'darwin-arm64', archive: 'piper_macos_aarch64.tar.gz', type: 'tar', inner: 'piper', bin: 'piper' },
  { triplet: 'win32-x64', archive: 'piper_windows_amd64.zip', type: 'zip', inner: 'piper', bin: 'piper.exe' }
]

const proxyIdx = process.argv.indexOf('--proxy')
const proxy = proxyIdx > -1 ? process.argv[proxyIdx + 1] : null

/** curl 下载（--proxy 时走 socks5），zip 用 unzip 解压 */
function download(archive, destFile) {
  const args = ['-sSL', '--fail', '-o', destFile]
  if (proxy) args.push('--socks5-hostname', proxy)
  args.push(`${BASE}/${archive}`)
  const res = spawnSync('curl', args, { stdio: 'inherit' })
  if (res.status !== 0) throw new Error(`curl ${archive} failed (exit ${res.status})`)
}

function extract(archive, type, outDir) {
  if (type === 'tar') {
    const res = spawnSync('tar', ['-xzf', archive, '-C', outDir], { stdio: 'inherit' })
    if (res.status !== 0) throw new Error(`tar ${archive} failed`)
  } else {
    const res = spawnSync('unzip', ['-oq', archive, '-d', outDir], { stdio: 'inherit' })
    if (res.status !== 0) throw new Error(`unzip ${archive} failed`)
  }
}

for (const { triplet, archive, type, inner, bin } of TRIPLETS) {
  const destDir = join(DEST, triplet)
  if (existsSync(join(destDir, bin))) {
    console.log(`跳过 ${triplet}（已存在）`)
    continue
  }
  console.log(`下载 ${triplet} ← ${archive}`)
  const tmp = join(DEST, `.tmp-${triplet}`)
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const archivePath = join(tmp, archive)
  download(archive, archivePath)
  extract(archivePath, type, tmp)
  // 官方包顶层目录名统一为 piper；bin + espeak-ng-data + 平台运行库平铺进 triplet 目录
  const innerDir = join(tmp, inner)
  rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })
  cpSync(join(innerDir, bin), join(destDir, bin))
  cpSync(join(innerDir, 'espeak-ng-data'), join(destDir, 'espeak-ng-data'), { recursive: true })
  for (const f of readdirSync(innerDir)) {
    if (f.endsWith('.so') || f.endsWith('.dll')) {
      cpSync(join(innerDir, f), join(destDir, f))
    }
  }
  rmSync(tmp, { recursive: true, force: true })
  console.log(`完成 ${triplet} → resources/piper/${triplet}`)
}
console.log('piper 二进制就绪。')
