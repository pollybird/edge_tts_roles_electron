<script setup lang="ts">
import type { AudioFormat, SubtitleFormat } from '../../../shared/types'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps<{
  outputPath: string
  format: AudioFormat
  subtitleFormat: SubtitleFormat
  progress: number
  progressMessage: string
  running: boolean
}>()

const emit = defineEmits<{
  'update:outputPath': [value: string]
  'update:format': [value: AudioFormat]
  'update:subtitleFormat': [value: SubtitleFormat]
  generate: []
  stop: []
}>()

const formats: AudioFormat[] = ['wav', 'mp3', 'ogg', 'flac']
const subtitleOptions: Array<{ value: SubtitleFormat; label: string }> = [
  { value: '', label: 'subtitle.none' },
  { value: 'lrc', label: 'subtitle.lrc' },
  { value: 'srt', label: 'subtitle.srt' }
]

async function chooseOutput(): Promise<void> {
  const path = await window.api.saveAudioFile(props.format)
  if (path) emit('update:outputPath', path)
}

function onFormatChange(e: Event): void {
  emit('update:format', (e.target as HTMLSelectElement).value as AudioFormat)
}

function onSubtitleFormatChange(e: Event): void {
  emit('update:subtitleFormat', (e.target as HTMLSelectElement).value as SubtitleFormat)
}
</script>

<template>
  <footer class="output-panel">
    <div class="row">
      <button class="btn" @click="chooseOutput">{{ t('output.chooseFile') }}</button>
      <span class="output-path">{{ outputPath || t('output.noPath') }}</span>
      <label class="format-field">
        {{ t('output.format') }}
        <select class="format-select" :value="format" @change="onFormatChange">
          <option v-for="f in formats" :key="f" :value="f">{{ f.toUpperCase() }}</option>
        </select>
      </label>
      <label class="format-field">
        {{ t('subtitle.label') }}
        <select
          class="format-select"
          data-testid="subtitle-format"
          :value="subtitleFormat"
          @change="onSubtitleFormatChange"
        >
          <option v-for="opt in subtitleOptions" :key="opt.value" :value="opt.value">
            {{ opt.value ? opt.value.toUpperCase() : t(opt.label) }}
          </option>
        </select>
      </label>
    </div>
    <div class="row">
      <button class="btn primary" :disabled="running" @click="emit('generate')">
        {{ t('output.generate') }}
      </button>
      <button class="btn danger" :disabled="!running" @click="emit('stop')">
        {{ t('output.stop') }}
      </button>
      <progress class="progress" :value="progress" max="100" />
      <span class="progress-message">{{ progressMessage }}</span>
    </div>
  </footer>
</template>
