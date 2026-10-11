import { existsSync } from 'fs'
import { join } from 'path'

/**
 * 定位 piper 可执行文件与 espeak-ng 数据目录：
 * - 打包环境：electron-builder extraResources 按架构 triplet 分层到
 *   <resources>/piper/<triplet>/（与 ffmpeg 同构；win-arm64 复用 win32-x64）；
 * - 开发环境：仓库 tools/piper/<官方 tar 解压目录>/piper（已被 .gitignore 排除）。
 * 未找到时返回 null（调用方按「离线引擎不可用」处理）。
 */
export interface PiperBinary {
  bin: string
  espeakData: string
}

const OFFICIAL_DIR_NAMES: Record<string, string> = {
  'linux-x64': 'piper_linux_x86_64',
  'linux-arm64': 'piper_linux_aarch64',
  'darwin-x64': 'piper_macos_x64',
  'darwin-arm64': 'piper_macos_aarch64',
  'win32-x64': 'piper_windows_x86_64'
}

/**
 * 打包内 piper 的 triplet 目录名（与 scripts/package-dist.mjs 的 sourceTriplet 一致）：
 * win-arm64 无官方 piper，包内放 win32-x64 二进制由系统模拟执行。
 */
export function piperTriplet(
  platform: string = process.platform,
  arch: string = process.arch
): string {
  if (platform === 'win32' && arch === 'arm64') return 'win32-x64'
  const os = { win32: 'win32', darwin: 'darwin', linux: 'linux' }[platform] ?? 'linux'
  return `${os}-${arch}`
}

export function locatePiperBinary(isPackaged: boolean, appPath: string): PiperBinary | null {
  const exeSuffix = process.platform === 'win32' ? '.exe' : ''
  const binName = `piper${exeSuffix}`

  const candidates: string[] = []
  if (isPackaged) {
    const resources = process.resourcesPath ?? appPath
    // <resources>/piper/<triplet>/piper
    candidates.push(join(resources, 'piper', piperTriplet(), binName))
    // 兼容平铺布局（<resources>/piper/piper）
    candidates.push(join(resources, 'piper', binName))
  } else {
    const dirName = OFFICIAL_DIR_NAMES[`${process.platform}-${process.arch}`]
    if (dirName) {
      candidates.push(join(appPath, 'tools', 'piper', dirName, binName))
      // 非官方目录名（手动解压）兼容
      candidates.push(join(appPath, 'tools', 'piper', 'piper', binName))
    }
  }

  for (const bin of candidates) {
    if (existsSync(bin)) {
      return { bin, espeakData: join(bin, '..', 'espeak-ng-data') }
    }
  }
  return null
}
