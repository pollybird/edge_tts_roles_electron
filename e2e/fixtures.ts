import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// 包为 CommonJS（根 package.json 无 type:module），playwright 按 CJS 转译，不能用 import.meta
const require = createRequire(join(process.cwd(), 'index.js'))
/** node_modules 中的 Electron 可执行文件 */
const electronPath = require('electron') as string
/** 测试始终从仓库根目录启动（npm run test:e2e），根目录 package.json 的 main 指向 out/main/index.js */
const projectRoot = process.cwd()

export interface AppContext {
  app: ElectronApplication
  page: Page
  /** 本次运行隔离的 userData 目录（electron-store 的 config.json 也在此） */
  userData: string
  /** 关闭应用并删除隔离目录（应用已自行退出时 close 容错） */
  cleanup: () => Promise<void>
}

export interface LaunchOptions {
  /** 复用已有 userData 目录（重启持久化场景）；不传则新建临时目录 */
  userData?: string
  /** 预置 agreementAccepted；默认 false（模拟全新安装的首启） */
  accepted?: boolean
  /** 预置 locale 偏好（'' 表示跟随系统） */
  locale?: string
}

/** 读取隔离 userData 中的 electron-store 配置 */
export async function readStore(userData: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(userData, 'config.json'), 'utf8'))
}

/**
 * 启动打包构建产物（out/）的 Electron 应用：
 * - 独立 --user-data-dir，保证用例间状态隔离、且不污染真实配置
 * - 强制 LANG=en_US，使“跟随系统”的初始界面语言确定为英文
 */
export async function launchApp(opts: LaunchOptions = {}): Promise<AppContext> {
  const userData = opts.userData ?? (await mkdtemp(join(tmpdir(), 'edge-tts-e2e-')))
  // 仅在全新目录写入种子配置；复用 userData（重启持久化场景）时保留应用自己落盘的配置
  const configPath = join(userData, 'config.json')
  let existing = true
  try {
    await readFile(configPath, 'utf8')
  } catch {
    existing = false
  }
  if (!existing) {
    const settings = {
      agreementAccepted: opts.accepted ?? false,
      locale: opts.locale ?? ''
    }
    await writeFile(configPath, JSON.stringify(settings), 'utf8')
  }

  const app = await electron.launch({
    executablePath: electronPath,
    args: [projectRoot, `--user-data-dir=${userData}`],
    env: {
      ...process.env,
      LANG: 'en_US.UTF-8',
      LANGUAGE: 'en_US:en',
      LC_ALL: 'en_US.UTF-8'
    }
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  const cleanup = async (): Promise<void> => {
    try {
      await app.close()
    } catch {
      // 应用可能已因“拒绝协议”自行退出
    }
    await rm(userData, { recursive: true, force: true })
  }

  return { app, page, userData, cleanup }
}

/** 等待 Electron 主进程自行退出（如“拒绝协议”触发 app.quit()） */
export async function waitForExit(app: ElectronApplication, timeoutMs = 15_000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = app.process()
    const timer = setTimeout(() => {
      proc.off('exit', onExit)
      reject(new Error('electron app did not exit in time'))
    }, timeoutMs)
    const onExit = (): void => {
      clearTimeout(timer)
      resolve()
    }
    proc.once('exit', onExit)
  })
}

/**
 * 点击原生“语言”菜单中的指定语言项（Playwright 无法操作原生菜单，
 * 经主进程 Menu API 程序化点击，走与用户真实点击完全相同的 click 回调链路）。
 */
export async function clickLanguageMenu(
  app: ElectronApplication,
  nativeLabel: string
): Promise<void> {
  await app.evaluate(
    ({ Menu }, [label]) => {
      const menu = Menu.getApplicationMenu()
      if (!menu) throw new Error('application menu not built')
      // 顶层“语言”菜单的标签随当前语言变化，改用子项特征反查父菜单
      const parent = menu.items.find((top) =>
        top.submenu?.items.some((item) => item.label === '简体中文' || item.label === 'English')
      )
      const target = parent?.submenu?.items.find((item) => item.label === label)
      if (!target) {
        const all = menu.items.flatMap((i) => i.submenu?.items.map((s) => s.label) ?? [])
        throw new Error(`language item not found: ${label}; available=${all.join('|')}`)
      }
      // 已选中的 radio 项 click 仍会触发回调；此处只点击目标语言
      target.click()
    },
    [nativeLabel] as const
  )
}
