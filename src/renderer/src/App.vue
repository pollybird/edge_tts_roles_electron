<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import TextEditor from './components/TextEditor.vue'
import RoleSettings from './components/RoleSettings.vue'
import AudioExtrasPanel from './components/AudioExtrasPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import PreviewDialog from './components/PreviewDialog.vue'
import AgreementDialog from './components/AgreementDialog.vue'
import UpdateDialog from './components/UpdateDialog.vue'
import type {
  AudioExtras,
  AudioFormat,
  RoleId,
  RoleVoiceSettings,
  SubtitleFormat,
  VoiceInfo
} from '../../shared/types'
import { ROLE_IDS, createDefaultAudioExtras } from '../../shared/types'
import { useI18n, applyLocaleLocal } from './composables/useI18n'

const { t, locale } = useI18n()

const text = ref('')
const voices = ref<VoiceInfo[]>([])
const outputPath = ref('')
const format = ref<AudioFormat>('wav')
/** 字幕输出格式（会话级，与音频格式一致不持久化） */
const subtitleFormat = ref<SubtitleFormat>('')
const progress = ref(0)
const progressMessage = ref(t('message.ready'))
const running = ref(false)

/** 文本编辑器组件实例（菜单触发查找/替换） */
const editorRef = ref<InstanceType<typeof TextEditor> | null>(null)

/** 试听弹窗 */
const previewVisible = ref(false)
const previewFilePath = ref('')

/** 首次运行用户协议弹窗：未同意前以强制模态遮罩锁定整个界面 */
const agreementRequired = ref(false)

/** 更新确认弹窗：发现新版本且未被“不再提示”跳过时弹出（'' = 隐藏） */
const updateDialogVersion = ref('')

async function handleAcceptAgreement(doNotShowAgain: boolean): Promise<void> {
  // 勾选“下次不再弹出”才持久化同意状态；未勾选则下次启动继续弹出
  if (doNotShowAgain) {
    await window.api.setSetting('agreementAccepted', true)
  }
  agreementRequired.value = false
}

function handleDeclineAgreement(): void {
  void window.api.quitApp()
}

/** 更新确认弹窗：立即下载（进度走 update.downloadProgress 状态栏），下载完成后确认安装 */
function handleUpdateInstall(): void {
  updateDialogVersion.value = ''
  void window.api.downloadUpdate()
}

/** 稍后提示：仅关闭弹窗，不持久化，下次启动静默检查发现后再次弹出 */
function handleUpdateLater(): void {
  updateDialogVersion.value = ''
}

/** 不再提示：按版本号持久化跳过；手动“检查更新”不受影响 */
function handleUpdateNever(): void {
  const version = updateDialogVersion.value
  updateDialogVersion.value = ''
  if (version) void window.api.skipUpdateVersion(version)
}

const roleSettings = reactive<RoleVoiceSettings>(
  Object.fromEntries(
    ROLE_IDS.map((id) => [id, { voice: '', rate: 0, volume: 0, pitch: 0 }])
  ) as RoleVoiceSettings
)

/** 前奏 / 尾声 / 背景音乐（路径 + 每路音量 0~100%） */
const audioExtras = reactive<AudioExtras>(createDefaultAudioExtras())

/** reactive 对象无法直接经 IPC 结构化克隆传输，先深拷贝为纯对象 */
function snapshotSettings(): RoleVoiceSettings {
  return JSON.parse(JSON.stringify(roleSettings)) as RoleVoiceSettings
}

function snapshotExtras(): AudioExtras {
  return JSON.parse(JSON.stringify(audioExtras)) as AudioExtras
}

function showError(err: unknown): void {
  progressMessage.value = err instanceof Error ? err.message : String(err)
}

async function handleGenerate(): Promise<void> {
  if (!text.value.trim()) {
    progressMessage.value = t('message.inputText')
    return
  }
  if (!outputPath.value) {
    progressMessage.value = t('message.selectOutput')
    return
  }
  running.value = true
  progress.value = 0
  progressMessage.value = t('message.generating')
  try {
    await window.api.generate({
      text: text.value,
      roleSettings: snapshotSettings(),
      outputPath: outputPath.value,
      format: format.value,
      extras: snapshotExtras(),
      subtitleFormat: subtitleFormat.value
    })
  } catch (err) {
    showError(err)
    running.value = false
  }
}

/** 发起试听：文本不含任何角色标记时自动补 [A]，默认由角色 A 朗读 */
async function startPreview(content: string, selectionOnly: boolean): Promise<void> {
  const trimmed = content.trim()
  if (selectionOnly && !trimmed) {
    progressMessage.value = t('message.selectForPreview')
    return
  }
  if (!trimmed) {
    progressMessage.value = t('message.inputText')
    return
  }
  let finalText = trimmed
  if (!/\[[ABCD]\]/.test(finalText)) {
    finalText = `[A]${finalText}`
  }
  running.value = true
  progress.value = 0
  progressMessage.value = t('message.generatingPreview')
  try {
    await window.api.preview({
      text: finalText,
      roleSettings: snapshotSettings(),
      extras: snapshotExtras()
    })
  } catch (err) {
    showError(err)
    running.value = false
  }
}

function handlePreviewAll(): void {
  void startPreview(text.value, false)
}

function handlePreviewSelection(selection: string): void {
  void startPreview(selection, true)
}

async function handleStop(): Promise<void> {
  await window.api.stop()
}

/** 保存当前角色语音配置到 JSON 文件 */
async function handleSaveConfig(): Promise<void> {
  try {
    const savedPath = await window.api.saveRoleSettings(snapshotSettings())
    if (savedPath) progressMessage.value = t('message.configSaved', { path: savedPath })
  } catch (err) {
    showError(err)
  }
}

/** 角色字段更新（子组件 RoleSettings 通过事件上报，此处为唯一写入口） */
function handleUpdateRole(
  id: RoleId,
  field: 'voice' | 'rate' | 'volume' | 'pitch',
  value: string | number
): void {
  if (field === 'voice') {
    roleSettings[id].voice = String(value)
  } else {
    roleSettings[id][field] = Number(value)
  }
}

/** 附加音频轨道更新（子组件 AudioExtrasPanel 通过事件上报） */
function handleUpdateTrack(
  key: 'intro' | 'outro' | 'bgm',
  field: 'path' | 'volume',
  value: string | number
): void {
  if (field === 'path') {
    audioExtras[key].path = String(value)
  } else {
    audioExtras[key].volume = Number(value)
  }
}

/** 从 JSON 文件加载角色语音配置（逐字段写回以保持响应式） */
async function handleLoadConfig(): Promise<void> {
  try {
    const loaded = await window.api.loadRoleSettings()
    if (!loaded) return
    for (const id of ROLE_IDS) {
      Object.assign(roleSettings[id], loaded[id])
    }
    progressMessage.value = t('message.configLoaded')
  } catch (err) {
    showError(err)
  }
}

/** 菜单：打开文本文件 */
async function handleOpenText(): Promise<void> {
  try {
    const result = await window.api.openTextFile()
    if (result) {
      text.value = result.content
      progressMessage.value = t('message.opened', { path: result.path })
    }
  } catch (err) {
    showError(err)
  }
}

/** 菜单：保存文本文件 */
async function handleSaveText(): Promise<void> {
  if (!text.value.trim()) {
    progressMessage.value = t('message.textEmpty')
    return
  }
  try {
    const savedPath = await window.api.saveTextFile(text.value)
    if (savedPath) progressMessage.value = t('message.textSaved', { path: savedPath })
  } catch (err) {
    showError(err)
  }
}

onMounted(() => {
  // 同步注册全部 IPC 订阅：必须先于任何 await，否则在音色列表等网络请求未返回前，
  // 语言切换、进度、菜单等事件会因监听尚未挂载而丢失。
  window.api.onProgress((p) => {
    progress.value = p.percent
    progressMessage.value = p.message
  })
  window.api.onFinished((payload) => {
    running.value = false
    progress.value = 100
    if (payload.kind === 'preview') {
      progressMessage.value = t('message.previewReady')
      previewFilePath.value = payload.filePath
      previewVisible.value = true
    } else {
      const audioMsg = t('message.audioGenerated', { path: payload.filePath })
      progressMessage.value = payload.subtitlePath
        ? `${audioMsg}\n${t('message.subtitleSaved', { path: payload.subtitlePath })}`
        : audioMsg
    }
  })
  window.api.onError((e) => {
    running.value = false
    progressMessage.value = t('message.errorPrefix', { msg: e.message })
  })
  // 用户停止任务：复位按钮与进度条（此前停止后生成按钮不会恢复）
  window.api.onStopped(() => {
    running.value = false
    progress.value = 0
    progressMessage.value = t('message.stopped')
  })

  // 自动更新状态反馈
  window.api.onUpdateEvent((event) => {
    switch (event.type) {
      case 'checking':
        progressMessage.value = t('update.checking')
        break
      case 'available':
        // 发现新版本：弹出确认对话框（主进程已按“不再提示”过滤过静默检查场景）
        updateDialogVersion.value = event.version
        break
      case 'not-available':
        // 启动时的自动检查保持静默；用户手动检查时明确提示“已是最新版本”
        if (event.manual) {
          window.alert(t('update.notAvailable'))
        }
        break
      case 'download-progress':
        progressMessage.value = t('update.downloadProgress', {
          percent: Math.round(event.percent)
        })
        break
      case 'downloaded':
        if (window.confirm(t('update.downloaded', { version: event.version }))) {
          void window.api.installUpdate()
        }
        break
      case 'error':
        // 更新错误不写入主界面状态栏，仅弹出通用提示
        window.alert(t('update.checkFailed'))
        break
    }
  })

  // 主进程“语言(L)”菜单切换广播
  window.api.onLocaleChanged((code) => applyLocaleLocal(code))

  // 主菜单动作分发
  window.api.onMenuAction((actionId) => {
    switch (actionId) {
      case 'open-text':
        void handleOpenText()
        break
      case 'save-text':
        void handleSaveText()
        break
      case 'save-config':
        void handleSaveConfig()
        break
      case 'load-config':
        void handleLoadConfig()
        break
      case 'find':
        void editorRef.value?.openFindBar(false)
        break
      case 'replace':
        void editorRef.value?.openFindBar(true)
        break
    }
  })

  // 语言切换时同步窗口标题；未在生成时把状态栏恢复为“就绪”
  watch(locale, () => {
    document.title = t('app.title')
    if (!running.value) {
      progressMessage.value = t('message.ready')
    }
  })

  // 异步初始化（协议门槛状态、音色列表）；不阻塞上面的事件订阅
  void (async () => {
    // 首次运行门槛：未同意用户协议前强制弹出，模态遮罩锁定主界面
    agreementRequired.value = !(await window.api.getSetting<boolean>('agreementAccepted'))

    // 窗口标题与初始状态栏随系统语言
    document.title = t('app.title')
    progressMessage.value = t('message.ready')

    voices.value = await window.api.listVoices()
  })()
})
</script>

<template>
  <div class="app">
    <main class="main">
      <TextEditor
        ref="editorRef"
        v-model:text="text"
        :running="running"
        @preview-all="handlePreviewAll"
        @preview-selection="handlePreviewSelection"
      />
      <div class="side-column">
        <RoleSettings
          :settings="roleSettings"
          :voices="voices"
          @save-config="handleSaveConfig"
          @load-config="handleLoadConfig"
          @update-role="handleUpdateRole"
        />
        <AudioExtrasPanel :extras="audioExtras" @update-track="handleUpdateTrack" />
      </div>
    </main>
    <OutputPanel
      v-model:output-path="outputPath"
      v-model:format="format"
      v-model:subtitle-format="subtitleFormat"
      :progress="progress"
      :progress-message="progressMessage"
      :running="running"
      @generate="handleGenerate"
      @stop="handleStop"
    />
    <PreviewDialog
      v-if="previewVisible"
      :file-path="previewFilePath"
      @close="previewVisible = false"
    />
    <AgreementDialog
      v-if="agreementRequired"
      @accept="handleAcceptAgreement"
      @decline="handleDeclineAgreement"
    />
    <UpdateDialog
      v-if="updateDialogVersion"
      :version="updateDialogVersion"
      @install="handleUpdateInstall"
      @later="handleUpdateLater"
      @never="handleUpdateNever"
    />
  </div>
</template>
