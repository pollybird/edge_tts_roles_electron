<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const emit = defineEmits<{
  /** 用户同意协议；payload 为是否勾选“下次不再弹出” */
  accept: [doNotShowAgain: boolean]
  /** 用户拒绝协议（调用方负责退出应用） */
  decline: []
}>()

const doNotShowAgain = ref(false)
const dialogEl = ref<HTMLElement | null>(null)
const acceptBtnEl = ref<HTMLButtonElement | null>(null)

/** 强制模态：打开时焦点落在“同意”按钮；Tab 在复选框/两个按钮之间循环，不落到遮罩后的界面 */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    // 不允许 ESC 关闭
    e.preventDefault()
    return
  }
  if (e.key !== 'Tab') return
  const focusables = dialogEl.value?.querySelectorAll<HTMLElement>('input, button')
  if (!focusables || focusables.length === 0) return
  const list = Array.from(focusables)
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => acceptBtnEl.value?.focus())
</script>

<template>
  <!-- 强制模态：不响应遮罩点击、无关闭按钮、不可 ESC 关闭，未同意前无法操作主界面 -->
  <div class="modal-mask agreement-mask">
    <div
      ref="dialogEl"
      class="agreement-dialog"
      role="dialog"
      :aria-modal="true"
      :aria-label="t('agreement.title')"
      @keydown="onKeydown"
    >
      <h2 class="modal-title">{{ t('agreement.title') }}</h2>

      <div class="agreement-body">{{ t('agreement.body') }}</div>

      <label class="agreement-optout">
        <input v-model="doNotShowAgain" type="checkbox" />
        <span>{{ t('agreement.doNotShowAgain') }}</span>
      </label>

      <div class="agreement-actions">
        <button class="btn danger" @click="emit('decline')">
          {{ t('agreement.decline') }}
        </button>
        <button ref="acceptBtnEl" class="btn primary" @click="emit('accept', doNotShowAgain)">
          {{ t('agreement.accept') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agreement-mask {
  z-index: 2000;
}

.agreement-dialog {
  width: 620px;
  max-width: calc(100vw - 40px);
  max-height: 85vh;
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.agreement-body {
  flex: 1;
  min-height: 120px;
  max-height: 55vh;
  overflow-y: auto;
  padding: 10px 12px;
  border: 1px solid var(--border, #d9d9d9);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.agreement-optout {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.agreement-optout input {
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.agreement-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
