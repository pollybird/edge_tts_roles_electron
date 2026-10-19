<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import type {
  CloudProviderId,
  CloudProvidersSettings,
  CloudProxyMode,
  CloudProxySettings
} from '../../../shared/types'
import {
  CLOUD_PROVIDER_IDS,
  createDefaultCloudProviders,
  DEFAULT_CLOUD_PROXY
} from '../../../shared/types'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const emit = defineEmits<{
  /** 关闭对话框（ESC / 遮罩 / 关闭按钮） */
  close: []
}>()

/** 卡片渲染顺序（共享类型里的单一事实来源） */
const PROVIDERS = CLOUD_PROVIDER_IDS

/** 各服务商凭据字段（与 CloudProvidersSettings 一一对应；value 为 i18n 键名）。
 * 讯飞字段顺序与讯飞控制台展示顺序一致（APPID → APISecret → APIKey），避免照控制台顺序填写时填反。 */
const FIELDS: Record<CloudProviderId, readonly string[]> = {
  google: ['apiKey'],
  xfyun: ['appId', 'apiSecret', 'apiKey'],
  // 火山：App ID 标识应用 + API Key 鉴权（新版控制台签发，替代旧版 Access Token）
  volc: ['appId', 'apiKey']
}

/** 表单本地副本（onMounted 从设置读入；每次变更整体写回 cloudProviders） */
const form = reactive<CloudProvidersSettings>(createDefaultCloudProviders())

/** 网络代理设置本地副本（mode/protocol 变更即写回；custom 模式展开协议/主机/端口字段） */
const proxyForm = reactive<CloudProxySettings>({ ...DEFAULT_CLOUD_PROXY })

async function persistProxy(): Promise<void> {
  await window.api.setSetting('cloudProxy', JSON.parse(JSON.stringify(proxyForm)))
}

function handleProxyMode(e: Event): void {
  proxyForm.mode = (e.target as HTMLSelectElement).value as CloudProxyMode
  void persistProxy()
}

function handleProxyProtocol(e: Event): void {
  proxyForm.protocol = (e.target as HTMLSelectElement).value === 'http' ? 'http' : 'socks5'
  void persistProxy()
}

function handleProxyHost(e: Event): void {
  proxyForm.host = (e.target as HTMLInputElement).value.trim()
  void persistProxy()
}

function handleProxyPort(e: Event): void {
  const port = Number.parseInt((e.target as HTMLInputElement).value, 10)
  proxyForm.port = Number.isInteger(port) && port > 0 && port < 65536 ? port : 1080
  void persistProxy()
}

/** 各服务商连接测试状态文案（'' = 未测试） */
const testStatus = reactive<Record<CloudProviderId, string>>({ google: '', xfyun: '', volc: '' })
const testing = reactive<Record<CloudProviderId, boolean>>({
  google: false,
  xfyun: false,
  volc: false
})

/** 整体写回 cloudProviders（electron-store 自动落盘；JSON 往返剥离响应式代理） */
async function persist(): Promise<void> {
  await window.api.setSetting('cloudProviders', JSON.parse(JSON.stringify(form)))
}

function toggleEnabled(id: CloudProviderId, e: Event): void {
  form[id].enabled = (e.target as HTMLInputElement).checked
  void persist()
}

function handleField(id: CloudProviderId, field: string, e: Event): void {
  ;(form[id] as unknown as Record<string, string>)[field] = (e.target as HTMLInputElement).value
  void persist()
}

/** 连接测试：先保存再由主进程用首个目录音色做一次微型合成（丢弃音频） */
async function handleTest(id: CloudProviderId): Promise<void> {
  await persist()
  testing[id] = true
  testStatus[id] = ''
  try {
    const res = await window.api.cloudTest(id)
    testStatus[id] = res.ok ? t('cloud.testOk') : t('cloud.testFailed', { msg: res.error ?? '' })
  } catch (err) {
    testStatus[id] = t('cloud.testFailed', {
      msg: err instanceof Error ? err.message : String(err)
    })
  } finally {
    testing[id] = false
  }
}

/** 各凭据输入框的明文显示状态（key: `${provider}:${field}`，默认密文） */
const visible = reactive<Record<string, boolean>>({})

function isVisible(p: CloudProviderId, f: string): boolean {
  return visible[`${p}:${f}`] === true
}

function toggleVisible(p: CloudProviderId, f: string): void {
  const key = `${p}:${f}`
  visible[key] = !visible[key]
}

/** 各服务商密钥申请说明的展开状态 */
const helpOpen = reactive<Record<CloudProviderId, boolean>>({
  google: false,
  xfyun: false,
  volc: false
})

function toggleHelp(id: CloudProviderId): void {
  helpOpen[id] = !helpOpen[id]
}

/** 各服务商凭据管理控制台直达地址（主进程 https 白名单内） */
const CONSOLE_URLS: Record<CloudProviderId, string> = {
  google: 'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com',
  xfyun: 'https://console.xfyun.cn/services/tts',
  volc: 'https://console.volcengine.com/speech/app'
}

/** 申请说明多行文案 → 行数组（i18n 键 cloud.helpGoogle/helpXfyun/helpVolc，\n 分隔步骤） */
function helpLines(id: CloudProviderId): string[] {
  const key = `cloud.help${id.charAt(0).toUpperCase()}${id.slice(1)}`
  return t(key).split('\n')
}

/** 打开服务商控制台（失败时复用卡片状态行展示错误） */
async function openConsole(id: CloudProviderId): Promise<void> {
  try {
    await window.api.openExternal(CONSOLE_URLS[id])
  } catch (err) {
    testStatus[id] = err instanceof Error ? err.message : String(err)
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  void (async () => {
    const saved = await window.api.getSetting<Partial<CloudProvidersSettings>>('cloudProviders')
    if (saved) {
      const merged = createDefaultCloudProviders()
      for (const id of PROVIDERS) {
        Object.assign(merged[id], saved[id] ?? {})
      }
      Object.assign(form, merged)
    }
    const savedProxy = await window.api.getSetting<Partial<CloudProxySettings>>('cloudProxy')
    Object.assign(proxyForm, DEFAULT_CLOUD_PROXY, savedProxy ?? {})
  })()
})
</script>

<template>
  <!-- 语音服务商设置模态：ESC / 点击遮罩 = 关闭（凭据在输入时已即时持久化） -->
  <div
    class="modal-mask cloud-providers-mask"
    data-testid="cloud-providers-dialog"
    @click.self="emit('close')"
    @keydown="onKeydown"
  >
    <div
      class="cloud-providers-dialog"
      role="dialog"
      :aria-modal="true"
      :aria-label="t('cloud.title')"
    >
      <h2 class="modal-title">{{ t('cloud.title') }}</h2>

      <!-- 网络代理：作用于三家云服务商的合成与音色清单请求（custom 模式展开协议/主机/端口） -->
      <section class="cloud-proxy" data-testid="cloud-proxy-section">
        <label class="cloud-proxy-field">
          <span>{{ t('cloud.proxyMode') }}</span>
          <select :value="proxyForm.mode" data-testid="cloud-proxy-mode" @change="handleProxyMode">
            <option value="direct">{{ t('cloud.proxyDirect') }}</option>
            <option value="system">{{ t('cloud.proxySystem') }}</option>
            <option value="custom">{{ t('cloud.proxyCustom') }}</option>
          </select>
        </label>
        <template v-if="proxyForm.mode === 'custom'">
          <label class="cloud-proxy-field">
            <span>{{ t('cloud.proxyProtocol') }}</span>
            <select
              :value="proxyForm.protocol"
              data-testid="cloud-proxy-protocol"
              @change="handleProxyProtocol"
            >
              <option value="socks5">SOCKS5</option>
              <option value="http">HTTP</option>
            </select>
          </label>
          <label class="cloud-proxy-field">
            <span>{{ t('cloud.proxyHost') }}</span>
            <input
              :value="proxyForm.host"
              type="text"
              placeholder="127.0.0.1"
              data-testid="cloud-proxy-host"
              @change="handleProxyHost"
            />
          </label>
          <label class="cloud-proxy-field">
            <span>{{ t('cloud.proxyPort') }}</span>
            <input
              :value="proxyForm.port"
              type="number"
              min="1"
              max="65535"
              data-testid="cloud-proxy-port"
              @change="handleProxyPort"
            />
          </label>
        </template>
      </section>

      <div v-for="p in PROVIDERS" :key="p" class="cloud-card" :data-testid="`cloud-card-${p}`">
        <div class="cloud-card-head">
          <label class="cloud-enable">
            <input
              type="checkbox"
              :checked="form[p].enabled"
              :data-testid="`cloud-enable-${p}`"
              @change="toggleEnabled(p, $event)"
            />
            <span>{{ t(`cloud.${p}`) }}</span>
          </label>
          <div class="cloud-card-tools">
            <button
              type="button"
              class="cloud-help-btn"
              :title="t('cloud.helpTitle')"
              :aria-label="t('cloud.helpTitle')"
              :aria-expanded="helpOpen[p]"
              :data-testid="`cloud-help-${p}`"
              @click="toggleHelp(p)"
            >
              ?
            </button>
            <button
              type="button"
              class="btn small"
              :disabled="testing[p]"
              :data-testid="`cloud-test-${p}`"
              @click="handleTest(p)"
            >
              {{ testing[p] ? t('cloud.testing') : t('cloud.test') }}
            </button>
          </div>
        </div>

        <!-- 密钥申请说明（点 ？ 展开；步骤文案与控制台链接随界面语言） -->
        <div v-if="helpOpen[p]" class="cloud-help" :data-testid="`cloud-help-panel-${p}`">
          <p v-for="(line, i) in helpLines(p)" :key="i" class="cloud-help-line">{{ line }}</p>
          <button type="button" class="cloud-help-link" @click="openConsole(p)">
            {{ t('cloud.openConsole') }} ↗
          </button>
        </div>

        <label v-for="f in FIELDS[p]" :key="f" class="field">
          <span>{{ t(`cloud.${f}`) }}</span>
          <div class="cloud-input-wrap">
            <input
              :type="isVisible(p, f) ? 'text' : 'password'"
              autocomplete="off"
              :value="(form[p] as unknown as Record<string, string>)[f]"
              :data-testid="`cloud-${p}-${f}`"
              @input="handleField(p, f, $event)"
            />
            <button
              type="button"
              class="cloud-eye"
              :title="t('cloud.toggleSecret')"
              :aria-label="t('cloud.toggleSecret')"
              :aria-pressed="isVisible(p, f)"
              :data-testid="`cloud-eye-${p}-${f}`"
              @click="toggleVisible(p, f)"
            >
              <!-- 密文时显示睁眼（点击明文），明文时显示闭眼（点击隐藏） -->
              <svg
                v-if="!isVisible(p, f)"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </label>

        <p v-if="testStatus[p]" class="cloud-test-status">{{ testStatus[p] }}</p>
      </div>

      <p class="cloud-note">{{ t('cloud.keysNote') }}</p>

      <div class="cloud-actions">
        <button type="button" class="btn" data-testid="cloud-close" @click="emit('close')">
          {{ t('cloud.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cloud-providers-mask {
  z-index: 1500;
}

.cloud-providers-dialog {
  width: 560px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 60px);
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.cloud-card {
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cloud-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/* 凭据输入 + 眼睛按钮的组合容器（inset-inline-end 保证 RTL 下按钮位置正确） */
.cloud-input-wrap {
  position: relative;
  display: flex;
}

.cloud-input-wrap input {
  flex: 1;
  padding-inline-end: 34px;
}

.cloud-eye {
  position: absolute;
  inset-inline-end: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.cloud-eye:hover {
  color: var(--text-primary, #333);
}

.cloud-proxy {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 12px;
  border: 1px dashed var(--border-color, #d0d0d0);
  border-radius: 6px;
  padding: 8px 10px;
}

.cloud-proxy-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cloud-proxy-field select,
.cloud-proxy-field input {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
}

.cloud-proxy-field input[type='number'] {
  width: 90px;
}

.cloud-proxy-field input[type='text'] {
  width: 170px;
}

.cloud-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cloud-enable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* 卡片头部右侧工具区：？帮助按钮 + 连接测试按钮 */
.cloud-card-tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 圆形 ？ 帮助按钮（点击展开/收起密钥申请说明） */
.cloud-help-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border-color, #d0d0d0);
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.cloud-help-btn:hover {
  color: var(--text-primary, #333);
  border-color: var(--text-secondary);
}

.cloud-help-btn[aria-expanded='true'] {
  background: var(--border-color, #eee);
}

/* 密钥申请说明面板：分步文案 + 控制台直达链接 */
.cloud-help {
  border: 1px dashed var(--border-color, #d0d0d0);
  border-radius: 6px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cloud-help-line {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.cloud-help-link {
  align-self: flex-start;
  margin-top: 2px;
  border: none;
  background: none;
  padding: 0;
  color: #1a73e8;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.cloud-help-link:hover {
  text-decoration: none;
}

.cloud-test-status {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
}

.cloud-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.cloud-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
