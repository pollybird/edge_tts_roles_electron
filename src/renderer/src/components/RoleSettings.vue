<script setup lang="ts">
import { computed } from 'vue'
import type { RoleVoiceSettings, VoiceInfo } from '../../../shared/types'
import { ROLE_IDS } from '../../../shared/types'
import { getVoiceDisplayName } from '../../../shared/voiceDisplay'
import { groupVoices } from '../../../shared/voiceGroups'
import type { VoiceGroup } from '../../../shared/voiceGroups'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps<{ settings: RoleVoiceSettings; voices: VoiceInfo[] }>()
defineEmits<{
  (e: 'save-config'): void
  (e: 'load-config'): void
}>()

/**
 * 语音分组：按语言分组（中文、英语、阿拉伯语……）。
 * 顺序：系统默认语言置顶 → 英语第二 → 其余语言按字母（中文环境按拼音）。
 */
const voiceGroups = computed<VoiceGroup[]>(() => groupVoices(props.voices))

/** 下拉显示文本：中文名 - 语言（国家/地区）- 性别；悬停可见 shortName */
function optionLabel(v: VoiceInfo): string {
  return getVoiceDisplayName(v)
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
          @click="$emit('save-config')"
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
    <!-- eslint-disable-next-line vue/no-mutating-props -->
    <div v-for="id in ROLE_IDS" :key="id" class="role-card">
      <h3 class="role-title">{{ t('roles.roleLabel', { id }) }}</h3>
      <label class="field">
        <span>{{ t('roles.voice') }}</span>
        <!-- eslint-disable-next-line vue/no-mutating-props -->
        <select v-model="settings[id].voice">
          <option value="">{{ t('roles.unselected') }}</option>
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
        </select>
      </label>
      <label class="field">
        <span>{{ t('roles.rate', { n: settings[id].rate }) }}</span>
        <!-- eslint-disable-next-line vue/no-mutating-props -->
        <input v-model.number="settings[id].rate" type="range" min="-100" max="100" />
      </label>
      <label class="field">
        <span>{{ t('roles.volume', { n: settings[id].volume }) }}</span>
        <!-- eslint-disable-next-line vue/no-mutating-props -->
        <input v-model.number="settings[id].volume" type="range" min="-100" max="100" />
      </label>
      <label class="field">
        <span>{{ t('roles.pitch', { n: settings[id].pitch }) }}</span>
        <!-- eslint-disable-next-line vue/no-mutating-props -->
        <input v-model.number="settings[id].pitch" type="range" min="-100" max="100" />
      </label>
    </div>
  </section>
</template>
