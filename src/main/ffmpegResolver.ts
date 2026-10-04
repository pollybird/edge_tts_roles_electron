/**
 * ffmpeg 可执行文件路径解析。
 *
 * ffmpeg-static 只会按“安装依赖时的平台”下载单个二进制，无法满足跨平台打包：
 * 因此打包前由 scripts/download-ffmpeg-binaries.cjs 下载全部目标平台二进制到
 * resources/ffmpeg/<platform>-<arch>/，并通过 electron-builder 的 extraResources
 * 放入安装包的 resources/ffmpeg/ 目录。
 *
 * 解析顺序：
 * 1. 打包环境：process.resourcesPath/ffmpeg/<platform>-<arch>/ffmpeg[.exe]；
 *    Windows ARM64 无官方原生构建时，回退到 x64 二进制（Win11 ARM64 内置 x64 模拟）；
 * 2. 开发环境：ffmpeg-static 按当前平台下载的二进制（node_modules）；
 * 3. 最终兜底：系统 PATH 中的 ffmpeg。
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import ffmpegStaticPath from 'ffmpeg-static'

/** 我们随包提供的二进制目标（与下载脚本中的矩阵保持一致） */
function candidateDirs(): string[] {
  const dirs = [`${process.platform}-${process.arch}`]
  // Windows on ARM 可模拟运行 x64 程序（ffmpeg-static 不提供 win32-arm64 构建）
  if (process.platform === 'win32' && process.arch === 'arm64') {
    dirs.push('win32-x64')
  }
  return dirs
}

export function resolveFfmpegPath(): string {
  const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

  if (app.isPackaged) {
    for (const dir of candidateDirs()) {
      const bundled = join(process.resourcesPath, 'ffmpeg', dir, exeName)
      if (existsSync(bundled)) return bundled
    }
  } else if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath
  }

  return 'ffmpeg'
}
