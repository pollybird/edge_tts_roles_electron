<script setup lang="ts">
import { computed } from 'vue'
import type { PiperVoiceStatus, RoleId, RoleVoiceSettings, VoiceInfo } from '../../../shared/types'
import { ROLE_IDS } from '../../../shared/types'
import { getVoiceDisplayName } from '../../../shared/voiceDisplay'
import { groupVoices } from '../../../shared/voiceGroups'
import type { VoiceGroup } from '../../../shared/voiceGroups'
import { useI18n } from '../composables/useI18n'

const { t, locale } = useI18n()

const props = defineProps<{
  settings: RoleVoiceSettings
  voices: VoiceInfo[]
  /** 仅离线模式（策略 = 仅离线）：发音人下拉不列 Edge 音色，改列已下载的 Piper 模型 */
  offlineMode: boolean
  /** Piper 模型清单（含下载状态），配合 offlineMode 过滤展示 */
  offlineVoices: PiperVoiceStatus[]
}>()
const emit = defineEmits<{
  (e: 'save-config'): void
  (e: 'load-config'): void
  (
    e: 'update-role',
    id: RoleId,
    field: 'voice' | 'rate' | 'volume' | 'pitch',
    value: string | number
  ): void
}>()

/** 滑块输入：把事件转成 update-role 事件，由父组件（状态拥有者）写回 */
function onFieldInput(id: RoleId, field: 'rate' | 'volume' | 'pitch', e: Event): void {
  emit('update-role', id, field, Number((e.target as HTMLInputElement).value))
}

function onVoiceChange(id: RoleId, e: Event): void {
  emit('update-role', id, 'voice', (e.target as HTMLSelectElement).value)
}

/**
 * 语音分组：按语言分组（中文、英语、阿拉伯语……）。
 * 顺序：系统默认语言置顶 → 英语第二 → 其余语言按字母（中文环境按拼音）。
 */
const voiceGroups = computed<VoiceGroup[]>(() => groupVoices(props.voices, locale.value))

/** 下拉显示文本：中文名 - 语言（国家/地区）- 性别；悬停可见 shortName */
function optionLabel(v: VoiceInfo): string {
  return getVoiceDisplayName(v, locale.value)
}

/** 仅离线模式的发音人选项：已下载的 Piper 模型（目录顺序 = 语言族字母序） */
const downloadedOffline = computed<PiperVoiceStatus[]>(() =>
  props.offlineVoices.filter((v) => v.downloaded)
)

/** 仅离线且无已下载模型：下拉以下载引导项取代「未选择」 */
const offlineEmpty = computed(() => props.offlineMode && downloadedOffline.value.length === 0)

/** 离线模型显示名：原生模型名（首字母大写）· 语言原生名（官方目录专有数据，不随界面语言变化） */
function offlineLabel(v: PiperVoiceStatus): string {
  const name = v.voiceName.charAt(0).toUpperCase() + v.voiceName.slice(1)
  return `${name} · ${v.langName}`
}
</script>

<template>
  <section class="panel roles-panel">
    <header class="panel-header panel-header-with-actions">
      <span>{{ t('roles.title') }}</span>
      <span class="config-actions">
        <button
          type="button"
          class="config-btn"
          :title="t('roles.saveConfigTip')"
          @click="emit('save-config')"
        >
          {{ t('roles.saveConfig') }}
        </button>
        <button
          type="button"
          class="config-btn"
          :title="t('roles.loadConfigTip')"
          @click="$emit('load-config')"
        >
          {{ t('roles.loadConfig') }}
        </button>
      </span>
    </header>
    <div v-for="id in ROLE_IDS" :key="id" class="role-card">
      <h3 class="role-title">{{ t('roles.roleLabel', { id }) }}</h3>
      <label class="field">
        <span>{{ t('roles.voice') }}</span>
        <select :value="settings[id].voice" @change="onVoiceChange(id, $event)">
          <option v-if="offlineEmpty" value="">{{ t('roles.noOfflineModels') }}</option>
          <option v-else value="">{{ t('roles.unselected') }}</option>
          <template v-if="offlineMode">
            <option v-for="v in downloadedOffline" :key="v.id" :value="v.id" :title="v.id">
              {{ offlineLabel(v) }}
            </option>
          </template>
          <template v-else>
            <optgroup
              v-for="g in voiceGroups"
              :key="g.lang"
              :label="t('roles.groupLabel', { label: g.label, n: g.voices.length })"
            >
              <option
                v-for="v in g.voices"
                :key="v.shortName"
                :value="v.shortName"
                :title="v.shortName"
              >
                {{ optionLabel(v) }}
              </option>
            </optgroup>
          </template>
        </select>
      </label>
      <label class="field">
        <span>{{ t('roles.rate', { n: settings[id].rate }) }}</span>
        <input
          :value="settings[id].rate"
          type="range"
          min="-100"
          max="100"
          @input="onFieldInput(id, 'rate', $event)"
        />
      </label>
      <label class="field">
        <span>{{ t('roles.volume', { n: settings[id].volume }) }}</span>
        <input
          :value="settings[id].volume"
          type="range"
          min="-100"
          max="100"
          @input="onFieldInput(id, 'volume', $event)"
        />
      </label>
      <label class="field">
        <span>{{ t('roles.pitch', { n: settings[id].pitch }) }}</span>
        <input
          :value="settings[id].pitch"
          type="range"
          min="-100"
          max="100"
          @input="onFieldInput(id, 'pitch', $event)"
        />
      </label>
    </div>
  </section>
</template>
