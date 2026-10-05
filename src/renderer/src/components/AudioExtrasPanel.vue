<script setup lang="ts">
import type { AudioExtras, ExtraAudioTrack } from '../../../shared/types'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

defineProps<{ extras: AudioExtras }>()
const emit = defineEmits<{
  (e: 'update-track', key: TrackKey, field: 'path' | 'volume', value: string | number): void
}>()

type TrackKey = 'intro' | 'outro' | 'bgm'

/** 面板上三路轨道的展示顺序：前奏 → 尾声 → 背景音乐 */
const trackKeys: TrackKey[] = ['intro', 'outro', 'bgm']

/** 从绝对路径中取文件名用于展示 */
function fileNameOf(track: ExtraAudioTrack): string {
  if (!track.path) return ''
  const parts = track.path.split(/[\\/]/)
  return parts[parts.length - 1]
}

/** 弹出文件选择对话框，选择本地音频作为该路轨道 */
async function handlePickFile(key: TrackKey): Promise<void> {
  try {
    const picked = await window.api.pickAudioFile()
    if (picked) emit('update-track', key, 'path', picked)
  } catch (err) {
    // 选择失败时保持原文件；至少打到控制台，避免静默吞错
    console.error('[extras] pick audio file failed:', err)
  }
}

/** 清除该路已选文件（音量设置保留） */
function handleClearFile(key: TrackKey): void {
  emit('update-track', key, 'path', '')
}

/** 滑块输入事件 */
function onVolumeInput(key: TrackKey, e: Event): void {
  emit('update-track', key, 'volume', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <section class="panel extras-panel">
    <header class="panel-header">{{ t('extras.title') }}</header>
    <div class="extras-body">
      <div
        v-for="key in trackKeys"
        :key="key"
        class="extra-row"
        :title="key === 'bgm' ? t('extras.bgmHint') : undefined"
      >
        <div class="extra-main">
          <div class="extra-head">
            <span class="extra-name">{{ t(`extras.${key}`) }}</span>
            <span class="extra-file" :title="extras[key].path">
              {{ extras[key].path ? fileNameOf(extras[key]) : t('extras.noFile') }}
            </span>
          </div>
          <div class="extra-actions">
            <button type="button" class="btn small" @click="handlePickFile(key)">
              {{ t('extras.choose') }}
            </button>
            <button
              type="button"
              class="btn small"
              :disabled="!extras[key].path"
              @click="handleClearFile(key)"
            >
              {{ t('extras.clear') }}
            </button>
          </div>
        </div>
        <div class="extra-volume">
          <input
            class="extra-volume-slider"
            :value="extras[key].volume"
            type="range"
            min="0"
            max="100"
            :aria-label="t('extras.volume', { n: extras[key].volume })"
            @input="onVolumeInput(key, $event)"
          />
          <span class="extra-volume-value">{{ extras[key].volume }}%</span>
        </div>
      </div>
    </div>
  </section>
</template>
