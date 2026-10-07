<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

defineProps<{
  /** 新版本号，如 2.0.5 */
  version: string
}>()

const emit = defineEmits<{
  /** 立即下载并安装 */
  install: []
  /** 稍后提示：不持久化，下次启动再次弹出 */
  later: []
  /** 不再提示：按版本号持久化跳过，更高版本仍会弹出 */
  never: []
}>()

const installBtnEl = ref<HTMLButtonElement | null>(null)

/** 非强制模态：ESC 等同于“稍后提示” */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('later')
  }
}

onMounted(() => installBtnEl.value?.focus())
</script>

<template>
  <!-- 更新确认模态：ESC / 点击遮罩 = 稍后提示，不做任何持久化 -->
  <div
    class="modal-mask update-mask"
    data-testid="update-dialog"
    @click.self="emit('later')"
    @keydown="onKeydown"
  >
    <div
      class="update-dialog"
      role="dialog"
      :aria-modal="true"
      :aria-label="t('update.dialogTitle')"
    >
      <h2 class="modal-title">{{ t('update.dialogTitle') }}</h2>

      <div class="update-body">{{ t('update.dialogBody', { version }) }}</div>

      <div class="update-actions">
        <button class="btn" data-testid="update-never" @click="emit('never')">
          {{ t('update.dialogNever') }}
        </button>
        <button class="btn" data-testid="update-later" @click="emit('later')">
          {{ t('update.dialogLater') }}
        </button>
        <button
          ref="installBtnEl"
          class="btn primary"
          data-testid="update-install"
          @click="emit('install')"
        >
          {{ t('update.dialogInstall') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-mask {
  z-index: 1500;
}

.update-dialog {
  width: 460px;
  max-width: calc(100vw - 40px);
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.update-body {
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
