<script setup lang="ts">
import type { AudioExtras, ExtraAudioTrack } from '../../../shared/types'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

defineProps<{ extras: AudioExtras }>()

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
async function handlePickFile(track: ExtraAudioTrack): Promise<void> {
  try {
    const picked = await window.api.pickAudioFile()
    if (picked) track.path = picked
  } catch (err) {
    // 选择失败时保持原文件；至少打到控制台，避免静默吞错
    console.error('[extras] pick audio file failed:', err)
  }
}

/** 清除该路已选文件（音量设置保留） */
function handleClearFile(track: ExtraAudioTrack): void {
  track.path = ''
}
</script>

<template>
  <section class="panel extras-panel">
    <header class="panel-header">{{ t('extras.title') }}</header>
    <div class="extras-body">
      <div v-for="key in trackKeys" :key="key" class="extra-row">
        <div class="extra-head">
          <span class="extra-name">{{ t(`extras.${key}`) }}</span>
          <span class="extra-file" :title="extras[key].path">
            {{ extras[key].path ? fileNameOf(extras[key]) : t('extras.noFile') }}
          </span>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <button type="button" class="btn small" @click="handlePickFile(extras[key])">
            {{ t('extras.choose') }}
          </button>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <button
            type="button"
            class="btn small"
            :disabled="!extras[key].path"
            @click="handleClearFile(extras[key])"
          >
            {{ t('extras.clear') }}
          </button>
        </div>
        <label class="field extra-volume">
          <span>{{ t('extras.volume', { n: extras[key].volume }) }}</span>
          <!-- eslint-disable-next-line vue/no-mutating-props -->
          <input v-model.number="extras[key].volume" type="range" min="0" max="100" />
        </label>
        <p v-if="key === 'bgm'" class="extra-hint">{{ t('extras.bgmHint') }}</p>
      </div>
    </div>
  </section>
</template>
