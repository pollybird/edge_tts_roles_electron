<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps<{
  text: string
  running: boolean
}>()

const emit = defineEmits<{
  'update:text': [value: string]
  previewAll: []
  previewSelection: [selection: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const backdropRef = ref<HTMLDivElement | null>(null)
const findInputRef = ref<HTMLInputElement | null>(null)
const replaceInputRef = ref<HTMLInputElement | null>(null)
const pauseMs = ref(1000)
const saveHint = ref('')

/** 快速停顿档位（毫秒），显示文案走 i18n（editor.secondsShort） */
const quickPauses = [500, 1000, 2000, 3000, 5000]
/** 角色标记（与 shared/types 的 ROLE_IDS 对应，模板 v-for 用） */
const ROLE_TAGS = ['A', 'B', 'C', 'D'] as const

/* ---------------- 标记高亮 ---------------- */

/** 先转义 HTML，再一次扫描把标记包上带配色类名的 <mark>，实现标记语法高亮 */
const highlightedHtml = computed(() => {
  const escaped = props.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 尾部补换行，保证文本满行时 backdrop 与 textarea 滚动高度一致
  return (
    escaped.replace(/\[([ABCD]|\d+|R)\]/g, (m, inner: string) => {
      let cls = 'hl-pause'
      if ('ABCD'.includes(inner)) cls = 'hl-role'
      else if (inner === 'R') cls = 'hl-beep'
      return `<mark class="${cls}">${m}</mark>`
    }) + '\n'
  )
})

function onInput(e: Event): void {
  emit('update:text', (e.target as HTMLTextAreaElement).value)
}

/** 在光标/选区位置插入标记，并恢复焦点与选区位置 */
async function insertTag(tag: string): Promise<void> {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  emit('update:text', props.text.slice(0, start) + tag + props.text.slice(end))
  await nextTick()
  ta.focus()
  const pos = start + tag.length
  ta.setSelectionRange(pos, pos)
}

function insertPause(): void {
  void insertTag(`[${pauseMs.value}]`)
}

/** textarea 滚动时同步高亮层 */
function syncScroll(): void {
  const ta = textareaRef.value
  const bd = backdropRef.value
  if (ta && bd) {
    bd.scrollTop = ta.scrollTop
    bd.scrollLeft = ta.scrollLeft
  }
}

async function openFile(): Promise<void> {
  const result = await window.api.openTextFile()
  if (result) {
    emit('update:text', result.content)
    saveHint.value = ''
  }
}

async function saveFile(): Promise<void> {
  const path = await window.api.saveTextFile(props.text)
  if (path) {
    saveHint.value = t('editor.textSaved')
    setTimeout(() => (saveHint.value = ''), 2000)
  }
}

function previewSelection(): void {
  const ta = textareaRef.value
  const sel = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : ''
  emit('previewSelection', sel)
}

/* ---------------- 查找 / 替换 ---------------- */

const findBarVisible = ref(false)
const replaceMode = ref(false)
const findQuery = ref('')
const replaceQuery = ref('')
const matchCase = ref(false)
const matches = ref<number[]>([])
const matchIndex = ref(-1)
/** 重新计算匹配后希望定位到的下标位置（替换后跳到下一处用） */
let locateAnchor: number | null = null

const matchCount = computed(() => matches.value.length)

/** 供主菜单（Ctrl+F / Ctrl+H）调用 */
async function openFindBar(replace = false): Promise<void> {
  findBarVisible.value = true
  replaceMode.value = replace
  // 若编辑器中有单行选中文本，自动带入查找框
  const ta = textareaRef.value
  if (ta) {
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd)
    if (sel && !sel.includes('\n')) findQuery.value = sel
  }
  recomputeMatches()
  await nextTick()
  ;(replace ? replaceInputRef.value : findInputRef.value)?.focus()
}

function closeFindBar(): void {
  findBarVisible.value = false
  textareaRef.value?.focus()
}

/** 计算全部匹配下标；若设置了 locateAnchor 则自动定位到其后的第一个匹配 */
function recomputeMatches(): void {
  const q = findQuery.value
  if (!q) {
    matches.value = []
    matchIndex.value = -1
    return
  }
  const haystack = matchCase.value ? props.text : props.text.toLowerCase()
  const needle = matchCase.value ? q : q.toLowerCase()
  const indices: number[] = []
  let from = 0
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) break
    indices.push(at)
    from = at + needle.length
  }
  matches.value = indices

  if (locateAnchor !== null) {
    const anchor = locateAnchor
    const next = indices.findIndex((i) => i >= anchor)
    matchIndex.value = next >= 0 ? next : indices.length ? 0 : -1
    locateAnchor = null
    void selectCurrentMatch()
  } else {
    matchIndex.value = -1
  }
}

watch([findQuery, matchCase], () => recomputeMatches())
// 文本变化（替换）后重新计算并尝试定位下一处
watch(
  () => props.text,
  () => {
    if (findBarVisible.value) recomputeMatches()
  }
)

async function selectCurrentMatch(): Promise<void> {
  if (matchIndex.value < 0) return
  const idx = matches.value[matchIndex.value]
  if (idx === undefined) return
  const q = findQuery.value
  const ta = textareaRef.value
  if (!ta) return
  await nextTick()
  ta.setSelectionRange(idx, idx + q.length)
  syncScroll()
}

function findNext(direction: 1 | -1): void {
  if (!matches.value.length) {
    recomputeMatches()
    if (!matches.value.length) return
  }
  const n = matches.value.length
  if (matchIndex.value < 0) {
    matchIndex.value = direction === 1 ? 0 : n - 1
  } else {
    matchIndex.value = (matchIndex.value + direction + n) % n
  }
  void selectCurrentMatch()
}

/** 替换当前选中的匹配；尚未选中时先查找下一处 */
function replaceOne(): void {
  const q = findQuery.value
  if (!q || !matches.value.length) return
  let idx: number
  if (matchIndex.value >= 0 && matches.value[matchIndex.value] !== undefined) {
    idx = matches.value[matchIndex.value]
  } else {
    matchIndex.value = 0
    idx = matches.value[0]
  }
  // 防御：确认该位置文本仍是查找词
  if (props.text.slice(idx, idx + q.length) !== q) {
    recomputeMatches()
    return
  }
  const nextText = props.text.slice(0, idx) + replaceQuery.value + props.text.slice(idx + q.length)
  locateAnchor = idx + replaceQuery.value.length
  emit('update:text', nextText)
}

/** 全部替换 */
function replaceAll(): void {
  const q = findQuery.value
  if (!q) return
  if (matchCase.value) {
    const parts = props.text.split(q)
    if (parts.length <= 1) return
    emit('update:text', parts.join(replaceQuery.value))
  } else {
    // 转义正则特殊字符，大小写不敏感全局替换
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'g')
    if (!re.test(props.text)) return
    emit(
      'update:text',
      props.text.replace(new RegExp(escaped, 'g'), () => replaceQuery.value)
    )
  }
  matchIndex.value = -1
  locateAnchor = null
}

defineExpose({ openFindBar })
</script>

<template>
  <section class="panel editor-panel">
    <header class="panel-header">
      <span>{{ t('editor.header') }}</span>
    </header>

    <!-- 查找 / 替换栏（Ctrl+F / Ctrl+H） -->
    <div v-if="findBarVisible" class="find-bar">
      <input
        ref="findInputRef"
        v-model="findQuery"
        class="find-input"
        type="text"
        :placeholder="t('editor.findPlaceholder')"
        @keydown.enter.exact.prevent="findNext(1)"
        @keydown.shift.enter.prevent="findNext(-1)"
        @keydown.esc="closeFindBar"
      />
      <label class="find-opt">
        <input v-model="matchCase" type="checkbox" />
        {{ t('editor.matchCase') }}
      </label>
      <span class="find-count">{{ matchIndex >= 0 ? matchIndex + 1 : 0 }}/{{ matchCount }}</span>
      <button class="btn small" @click="findNext(-1)">{{ t('editor.prevMatch') }}</button>
      <button class="btn small" @click="findNext(1)">{{ t('editor.nextMatch') }}</button>
      <template v-if="replaceMode">
        <input
          ref="replaceInputRef"
          v-model="replaceQuery"
          class="find-input"
          type="text"
          :placeholder="t('editor.replacePlaceholder')"
          @keydown.enter.prevent="replaceOne"
          @keydown.esc="closeFindBar"
        />
        <button class="btn small" @click="replaceOne">{{ t('editor.replace') }}</button>
        <button class="btn small" @click="replaceAll">{{ t('editor.replaceAll') }}</button>
      </template>
      <button class="btn small find-close" :title="t('editor.closeFind')" @click="closeFindBar">
        ✕
      </button>
    </div>

    <!-- 高亮编辑器：底层渲染层 + 透明 textarea 叠放，同步滚动 -->
    <div class="editor-wrap">
      <div ref="backdropRef" class="highlight-backdrop" v-html="highlightedHtml" />
      <textarea
        ref="textareaRef"
        class="editor-input"
        data-testid="script-editor"
        :value="text"
        spellcheck="false"
        :placeholder="t('editor.placeholder')"
        @input="onInput"
        @scroll="syncScroll"
      />
    </div>

    <div class="toolbar">
      <!-- 角色标记 + 停顿 + 蜂鸣 -->
      <div class="tool-row">
        <button
          v-for="role in ROLE_TAGS"
          :key="role"
          class="btn small"
          :data-testid="`insert-role-${role}`"
          @click="insertTag(`[${role}]`)"
        >
          {{ t('editor.insertRole', { tag: `[${role}]` }) }}
        </button>
        <button class="btn small" data-testid="insert-pause" @click="insertPause">
          {{ t('editor.insertPause') }}
        </button>
        <label class="pause-input">
          {{ t('editor.pauseMs') }}
          <input
            v-model.number="pauseMs"
            data-testid="pause-ms"
            type="number"
            min="10"
            max="10000"
            step="10"
          />
        </label>
        <button class="btn small" data-testid="insert-beep" @click="insertTag('[R]')">
          {{ t('editor.insertBeep') }}
        </button>
      </div>

      <!-- 快速停顿 -->
      <div class="tool-row">
        <span class="tool-label">{{ t('editor.quickPause') }}</span>
        <button
          v-for="ms in quickPauses"
          :key="ms"
          class="btn small quick"
          :data-testid="`quick-pause-${ms}`"
          @click="insertTag(`[${ms}]`)"
        >
          ⏱️ {{ t('editor.secondsShort', { n: ms / 1000 }) }}
        </button>
      </div>

      <!-- 文件操作 + 试听 -->
      <div class="tool-row">
        <button class="btn small" @click="openFile">{{ t('editor.openText') }}</button>
        <button class="btn small" @click="saveFile">{{ t('editor.saveText') }}</button>
        <span v-if="saveHint" class="save-hint">{{ saveHint }}</span>
        <span class="tool-spacer" />
        <span class="tool-label">{{ t('editor.preview') }}</span>
        <button class="btn small primary" :disabled="running" @click="previewSelection">
          {{ t('editor.previewSelection') }}
        </button>
        <button class="btn small primary" :disabled="running" @click="emit('previewAll')">
          {{ t('editor.previewAll') }}
        </button>
      </div>
    </div>

    <footer class="panel-footer">
      <span>{{ t('editor.charCount', { n: text.length }) }}</span>
      <span class="copyright">{{ t('app.copyright') }}</span>
    </footer>
  </section>
</template>
