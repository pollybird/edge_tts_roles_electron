<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: [] }>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const canStop = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const volume = ref(80)
const status = ref(t('preview.loading'))
const loadError = ref('')

let blobUrl: string | null = null

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function onLoadedMetadata(): void {
  const a = audioEl.value
  if (!a) return
  duration.value = a.duration
  a.volume = volume.value / 100
  status.value = t('preview.ready')
  void a.play().catch(() => {
    // 自动播放被拦截时停留在准备状态，等用户点播放
    status.value = t('preview.readyClickHint')
  })
}

function onTimeUpdate(): void {
  const a = audioEl.value
  if (a) currentTime.value = a.currentTime
}

function onPlay(): void {
  isPlaying.value = true
  canStop.value = true
  status.value = t('preview.playing')
}

function onPause(): void {
  isPlaying.value = false
  if (audioEl.value && audioEl.value.currentTime > 0 && !audioEl.value.ended) {
    status.value = t('preview.paused')
  }
}

function onEnded(): void {
  isPlaying.value = false
  currentTime.value = 0
  if (audioEl.value) audioEl.value.currentTime = 0
  status.value = t('preview.ended')
}

function play(): void {
  void audioEl.value?.play()
}

function pause(): void {
  audioEl.value?.pause()
}

function stop(): void {
  const a = audioEl.value
  if (!a) return
  a.pause()
  a.currentTime = 0
  currentTime.value = 0
  isPlaying.value = false
  canStop.value = false
  status.value = t('preview.stopped')
}

/** 拖动进度条 */
function onSeek(e: Event): void {
  const a = audioEl.value
  if (!a || !duration.value) return
  const percent = Number((e.target as HTMLInputElement).value)
  a.currentTime = (percent / 100) * duration.value
  currentTime.value = a.currentTime
}

function onVolume(): void {
  if (audioEl.value) audioEl.value.volume = volume.value / 100
}

function close(): void {
  emit('close')
}

onMounted(async () => {
  try {
    const data = await window.api.readAudioFile(props.filePath)
    blobUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'audio/wav' }))
    if (audioEl.value) {
      audioEl.value.src = blobUrl
      // load 后由 loadedmetadata 事件继续
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
    status.value = t('preview.loadFailed')
  }
})

onBeforeUnmount(() => {
  const a = audioEl.value
  if (a) {
    a.pause()
    a.src = ''
  }
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
})
</script>

<template>
  <div class="modal-mask" @click.self="close">
    <div class="modal preview-dialog">
      <h2 class="modal-title">{{ t('preview.title') }}</h2>

      <div v-if="loadError" class="modal-error">{{ loadError }}</div>

      <label class="seek-label">{{ t('preview.progress') }}</label>
      <input
        class="seek-bar"
        type="range"
        min="0"
        max="100"
        step="0.1"
        :value="duration ? (currentTime / duration) * 100 : 0"
        @input="onSeek"
      />
      <div class="time-label">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>

      <div class="player-controls">
        <button class="btn primary" :disabled="isPlaying" @click="play">
          {{ t('preview.play') }}
        </button>
        <button class="btn" :disabled="!isPlaying" @click="pause">{{ t('preview.pause') }}</button>
        <button class="btn danger" :disabled="!canStop" @click="stop">
          {{ t('preview.stop') }}
        </button>
      </div>

      <div class="volume-row">
        <span>{{ t('preview.volume') }}</span>
        <input
          v-model.number="volume"
          class="volume-bar"
          type="range"
          min="0"
          max="100"
          @input="onVolume"
        />
        <span class="volume-value">{{ volume }}%</span>
      </div>

      <div class="player-status">{{ status }}</div>

      <button class="btn close-btn" @click="close">{{ t('preview.close') }}</button>

      <audio
        ref="audioEl"
        preload="metadata"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
      />
    </div>
  </div>
</template>
