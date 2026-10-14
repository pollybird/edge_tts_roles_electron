<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import type { PiperFallback, PiperVoiceStatus } from '../../../shared/types'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const emit = defineEmits<{
  /** 关闭对话框（ESC / 遮罩 / 关闭按钮） */
  close: []
}>()

/** 策略三选项（下拉单选，选择即持久化；界面顺序：在线优先 → 仅在线 → 仅离线） */
const strategies: PiperFallback[] = ['fallback', 'off', 'prefer']

const strategy = ref<PiperFallback>('fallback')
const engineAvailable = ref(true)
const voices = ref<PiperVoiceStatus[]>([])
/** 各模型下载进度（received/total/resuming；total=0 视为未知大小） */
const downloading = reactive<
  Record<string, { received: number; total: number; resuming: boolean }>
>({})
/** 对话框内一次性状态消息（下载/删除结果、错误） */
const statusMessage = ref('')
/** 列表过滤关键词（匹配模型名 / 语言名 / 模型 ID） */
const filter = ref('')

let unsubscribe: (() => void) | null = null

/** 模型显示名：原生模型名（首字母大写）· 语言原生名（均为官方目录专有数据，不随界面语言变化） */
function modelLabel(v: PiperVoiceStatus): string {
  const name = v.voiceName.charAt(0).toUpperCase() + v.voiceName.slice(1)
  return `${name} · ${v.langName}`
}

/** 过滤后的模型列表（大小写不敏感的子串匹配） */
const filteredVoices = computed<PiperVoiceStatus[]>(() => {
  const kw = filter.value.trim().toLowerCase()
  if (!kw) return voices.value
  return voices.value.filter((v) =>
    `${v.voiceName} ${v.langName} ${v.id}`.toLowerCase().includes(kw)
  )
})

/** 下载进度百分比；总大小未知时返回 null（界面显示不确定进度） */
function percentOf(id: string): number | null {
  const p = downloading[id]
  if (!p || p.total <= 0) return null
  return Math.min(100, Math.round((p.received / p.total) * 100))
}

/** 下载中进度文案：总大小已知显示百分比，未知显示“下载中”；续传时显示“继续下载（x%）” */
function progressText(id: string): string {
  const p = percentOf(id)
  const entry = downloading[id]
  if (entry?.resuming) {
    return p !== null ? t('piper.resumingPercent', { percent: p }) : t('piper.resuming')
  }
  return p !== null ? t('piper.downloadingPercent', { percent: p }) : t('piper.downloading')
}

async function refresh(): Promise<void> {
  try {
    const payload = await window.api.piperList()
    engineAvailable.value = payload.engineAvailable
    voices.value = payload.voices
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : String(err)
  }
}

async function handleStrategyChange(e: Event): Promise<void> {
  const value = (e.target as HTMLSelectElement).value as PiperFallback
  strategy.value = value
  await window.api.setSetting('piperFallback', value)
}

async function handleDownload(id: string): Promise<void> {
  statusMessage.value = ''
  downloading[id] = { received: 0, total: 0, resuming: false }
  try {
    await window.api.piperDownload(id)
    statusMessage.value = t('piper.downloadDone')
  } catch (err) {
    statusMessage.value = t('piper.downloadFailed', {
      msg: err instanceof Error ? err.message : String(err)
    })
  } finally {
    delete downloading[id]
    await refresh()
  }
}

async function handleRemove(id: string): Promise<void> {
  if (!window.confirm(t('piper.confirmRemove'))) return
  statusMessage.value = ''
  try {
    await window.api.piperRemove(id)
    statusMessage.value = t('piper.removed')
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : String(err)
  }
  await refresh()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  // 订阅下载进度推送（先订阅后取列表，避免丢首帧）
  unsubscribe = window.api.onPiperDownloadProgress((p) => {
    downloading[p.id] = {
      received: p.received,
      total: p.total,
      resuming: p.resuming ?? false
    }
  })
  void (async () => {
    const saved = await window.api.getSetting<PiperFallback>('piperFallback')
    if (saved === 'off' || saved === 'fallback' || saved === 'prefer') {
      strategy.value = saved
    }
    await refresh()
  })()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <!-- 离线引擎设置模态：ESC / 点击遮罩 = 关闭（设置在变更时已即时持久化） -->
  <div
    class="modal-mask offline-engine-mask"
    data-testid="offline-engine-dialog"
    @click.self="emit('close')"
    @keydown="onKeydown"
  >
    <div
      class="offline-engine-dialog"
      role="dialog"
      :aria-modal="true"
      :aria-label="t('piper.title')"
    >
      <h2 class="modal-title">{{ t('piper.title') }}</h2>

      <label class="field">
        <span>{{ t('piper.strategy') }}</span>
        <select
          :value="strategy"
          :disabled="!engineAvailable"
          :title="t('piper.strategyHint')"
          @change="handleStrategyChange"
        >
          <option v-for="s in strategies" :key="s" :value="s">
            {{ t(`piper.strategy_${s}`) }}
          </option>
        </select>
      </label>

      <p v-if="!engineAvailable" class="piper-unavailable">
        {{ t('piper.engineUnavailable') }}
      </p>

      <template v-else>
        <input
          v-model="filter"
          type="text"
          class="piper-filter"
          :placeholder="t('piper.filterPlaceholder')"
        />

        <ul class="piper-models">
          <li v-for="v in filteredVoices" :key="v.id" class="piper-model">
            <div class="piper-model-main">
              <span class="piper-model-name" :title="v.id">{{ modelLabel(v) }}</span>
              <span class="piper-model-meta">
                {{ v.quality }} · {{ t('piper.size', { n: v.sizeMB }) }} ·
                {{ t(`piper.state_${v.downloaded ? 'downloaded' : 'notDownloaded'}`) }}
              </span>
            </div>
            <div class="piper-model-actions">
              <button
                v-if="!v.downloaded"
                type="button"
                class="btn small"
                :disabled="v.id in downloading"
                @click="handleDownload(v.id)"
              >
                {{ t('piper.download') }}
              </button>
              <button
                v-else
                type="button"
                class="btn small danger"
                :disabled="v.id in downloading"
                @click="handleRemove(v.id)"
              >
                {{ t('piper.remove') }}
              </button>
            </div>
            <div v-if="v.id in downloading" class="piper-progress-row">
              <progress class="progress" :value="percentOf(v.id) ?? 0" :max="100" />
              <span class="piper-progress-text">{{ progressText(v.id) }}</span>
            </div>
          </li>
        </ul>
      </template>

      <p v-if="statusMessage" class="piper-status">{{ statusMessage }}</p>

      <div class="offline-engine-actions">
        <button type="button" class="btn" data-testid="offline-engine-close" @click="emit('close')">
          {{ t('piper.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.offline-engine-mask {
  z-index: 1500;
}

.offline-engine-dialog {
  width: 560px;
  max-width: calc(100vw - 40px);
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.piper-filter {
  padding: 6px 10px;
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
}

.piper-unavailable {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.piper-models {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 53 条模型列表：固定高度内滚动，对话框整体不超高 */
  max-height: 46vh;
  overflow-y: auto;
}

.piper-model {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.piper-model-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.piper-model-name {
  font-size: 13px;
  font-weight: 600;
  /* 长模型名截断显示，悬停可见全名 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.piper-model-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.piper-model-actions {
  display: inline-flex;
  gap: 6px;
}

.piper-progress-row {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.piper-progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.piper-status {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
}

.offline-engine-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
