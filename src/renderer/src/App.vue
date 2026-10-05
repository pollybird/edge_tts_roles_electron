<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import TextEditor from './components/TextEditor.vue'
import RoleSettings from './components/RoleSettings.vue'
import AudioExtrasPanel from './components/AudioExtrasPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import PreviewDialog from './components/PreviewDialog.vue'
import type {
  AudioExtras,
  AudioFormat,
  RoleId,
  RoleVoiceSettings,
  VoiceInfo
} from '../../shared/types'
import { ROLE_IDS, createDefaultAudioExtras } from '../../shared/types'
import { useI18n } from './composables/useI18n'

const { t, locale } = useI18n()

const text = ref('')
const voices = ref<VoiceInfo[]>([])
const outputPath = ref('')
const format = ref<AudioFormat>('wav')
const progress = ref(0)
const progressMessage = ref(t('message.ready'))
const running = ref(false)

/** 文本编辑器组件实例（菜单触发查找/替换） */
const editorRef = ref<InstanceType<typeof TextEditor> | null>(null)

/** 试听弹窗 */
const previewVisible = ref(false)
const previewFilePath = ref('')

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
      extras: snapshotExtras()
    })
  } catch (err) {
    showError(err)
    running.value = false
  }
}

/** 发起试听（与原版一致：无角色标记时自动补 [A]） */
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

onMounted(async () => {
  // 窗口标题与初始状态栏随系统语言
  document.title = t('app.title')
  progressMessage.value = t('message.ready')

  // 语言切换时同步窗口标题；未在生成时把状态栏恢复为“就绪”
  watch(locale, () => {
    document.title = t('app.title')
    if (!running.value) {
      progressMessage.value = t('message.ready')
    }
  })

  voices.value = await window.api.listVoices()

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
      progressMessage.value = t('message.audioGenerated', { path: payload.filePath })
    }
  })
  window.api.onError((e) => {
    running.value = false
    progressMessage.value = t('message.errorPrefix', { msg: e.message })
  })

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
  </div>
</template>
