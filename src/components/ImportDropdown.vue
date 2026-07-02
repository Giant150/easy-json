<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'
import { UploadCloud, Terminal, Globe, FileCode, RefreshCw } from 'lucide-vue-next'

const emit = defineEmits(['import-text'])
const showToast = inject('showToast')

const panelOpen = ref(false)
const activeTab = ref('file') // 'file' | 'curl' | 'url' | 'base64'
const curlInput = ref('')
const urlInput = ref('')
const base64Input = ref('')
const loading = ref(false)

const switchTab = (tab) => {
  activeTab.value = tab
  curlInput.value = ''
  urlInput.value = ''
  base64Input.value = ''
}

// ─── cURL 命令解析器（浏览器兼容） ───
const parseCurl = (cmd) => {
  // 清洗折行符：\  (Unix) / ^ (Windows)
  const cleaned = cmd.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ')
  // 提取所有引号内字符串和裸 token
  const tokens = []
  const re = /'([^']*)'|"([^"]*)"|(\S+)/g
  let m
  while ((m = re.exec(cleaned)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3])
  }
  let url = '', method = 'GET'; const headers = {}; let body = ''
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]; const n = tokens[i + 1]
    if (t === '-H' || t === '--header') { if (n) { const idx = n.indexOf(':'); if (idx > 0) headers[n.slice(0, idx).trim()] = n.slice(idx + 1).trim(); i++ } }
    else if (t === '-X' || t === '--request') { if (n) { method = n.toUpperCase(); i++ } }
    else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-ascii') { if (n) { body = n; if (method === 'GET') method = 'POST'; i++ } }
    else if (t.startsWith('http://') || t.startsWith('https://')) { url = t }
    else if (/^curl$/i.test(t) || t.startsWith('-') || t.startsWith('--')) { /* skip flag */ }
    else if (!url && /^[a-zA-Z0-9][-a-zA-Z0-9+&@#/%?=~_|!:,.;]+/.test(t)) { url = t.startsWith('http') ? t : 'https://' + t }
  }
  if (!url) throw new Error('未找到有效 URL')
  try { if (body) body = JSON.stringify(JSON.parse(body), null, 2) } catch {}
  return { url, method, headers, body }
}

// 美化 JSON 文本
const beautify = (text) => {
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

// 本地文件导入
const handleFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    emit('import-text', beautify(ev.target.result))
    showToast('文件导入成功')
    panelOpen.value = false
  }
  reader.readAsText(file)
}

// 拖拽文件支持
const isDragging = ref(false)
const onDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}
const onDragLeave = () => {
  isDragging.value = false
}
const onDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && (file.type === "application/json" || file.name.endsWith('.json') || file.name.endsWith('.txt'))) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      emit('import-text', beautify(ev.target.result))
      showToast('文件导入成功')
      panelOpen.value = false
    }
    reader.readAsText(file)
  } else {
    showToast('仅支持导入 .json 或 .txt 文件', 'error')
  }
}

// curl 导入
const handleCurl = async () => {
  if (!curlInput.value.trim()) return
  loading.value = true
  try {
    const { url, method, headers, body } = parseCurl(curlInput.value)
    const opts = { method, headers: { ...headers } }
    if (body && method !== 'GET') opts.body = body
    const res = await fetch(url, opts)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    emit('import-text', beautify(await res.text()))
    showToast('curl 请求完成，已导入结果')
    panelOpen.value = false
  } catch (e) { showToast(`curl 执行失败: ${e.message}`, 'error') }
  finally { loading.value = false }
}

// URL 导入
const handleUrl = async () => {
  if (!urlInput.value.trim()) return
  loading.value = true
  try {
    const url = urlInput.value.startsWith('http') ? urlInput.value : 'https://' + urlInput.value
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    emit('import-text', beautify(await res.text()))
    showToast('请求完成，已导入结果')
    panelOpen.value = false
  } catch (e) { showToast(`请求失败: ${e.message}`, 'error') }
  finally { loading.value = false }
}

// ─── UTF-8 安全 Base64 解码器 ───
// 通过 Uint8Array 与 TextDecoder 转换原始二进制字节流，100% 解决各种非西欧字符（如中文）解码时的乱码问题
const handleBase64 = () => {
  if (!base64Input.value.trim()) return
  try {
    const binString = atob(base64Input.value.trim())
    const len = binString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binString.charCodeAt(i)
    }
    const decodedText = new TextDecoder('utf-8').decode(bytes)
    emit('import-text', beautify(decodedText))
    showToast('Base64 解码成功')
    panelOpen.value = false
  } catch (e) { 
    showToast('Base64 解码失败，请检查输入格式是否正确', 'error') 
  }
}

// 外部点击关闭
const onDocClick = (e) => {
  if (panelOpen.value && !e.target.closest('.import-btn-wrap')) {
    panelOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="import-btn-wrap">
    <!-- 优化后的高级微立体主按钮 -->
    <button 
      class="trigger-icon-btn outline" 
      data-tooltip-bottom="导入" 
      @click.stop="panelOpen = !panelOpen"
    >
      <UploadCloud class="btn-icon" />
    </button>

    <!-- 下拉选项卡面板 -->
    <div class="import-dropdown" :class="{ open: panelOpen }" @click.stop>
      <!-- macOS Inset Segmented Tabs 选项卡 -->
      <div class="import-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'file' }" 
          @click="switchTab('file')"
        >
          <UploadCloud class="tab-icon" />
          <span>文件</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'curl' }" 
          @click="switchTab('curl')"
        >
          <Terminal class="tab-icon" />
          <span>cURL</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'url' }" 
          @click="switchTab('url')"
        >
          <Globe class="tab-icon" />
          <span>URL</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'base64' }" 
          @click="switchTab('base64')"
        >
          <FileCode class="tab-icon" />
          <span>Base64</span>
        </button>
      </div>

      <!-- 面板内容区 -->
      <div class="import-panes">
        
        <!-- Tab 1: 拖拽/点击本地文件上传 -->
        <div v-if="activeTab === 'file'" class="pane-content">
          <label 
            class="file-drop-zone"
            :class="{ dragging: isDragging }"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
          >
            <UploadCloud class="drop-icon" />
            <span class="drop-title">拖拽文件到此处，或<span>点击浏览</span></span>
            <span class="drop-desc">支持 .json / .txt 格式</span>
            <input type="file" accept=".json,.txt" @change="handleFile" class="hidden-input" />
          </label>
        </div>

        <!-- Tab 2: cURL 导入 -->
        <div v-if="activeTab === 'curl'" class="pane-content">
          <textarea 
            v-model="curlInput" 
            placeholder="粘贴您的 cURL 请求命令，例如：&#10;curl 'https://api.example.com/data'" 
            rows="5" 
            class="import-textarea"
          ></textarea>
          <div class="pane-actions">
            <span class="pane-hint">自动分析并发送 Method 和 Headers</span>
            <button class="submit-btn" :disabled="loading" @click="handleCurl">
              <RefreshCw v-if="loading" class="spinner" />
              <span>{{ loading ? '请求中' : '执行解析' }}</span>
            </button>
          </div>
        </div>

        <!-- Tab 3: URL 导入 -->
        <div v-if="activeTab === 'url'" class="pane-content">
          <input 
            v-model="urlInput" 
            placeholder="输入远程接口 API 地址..." 
            class="import-input" 
            @keyup.enter="handleUrl" 
          />
          <div class="pane-actions">
            <span class="pane-hint">发送 GET 请求并格式化响应体</span>
            <button class="submit-btn" :disabled="loading" @click="handleUrl">
              <RefreshCw v-if="loading" class="spinner" />
              <span>{{ loading ? '请求中' : '发送请求' }}</span>
            </button>
          </div>
        </div>

        <!-- Tab 4: Base64 解码 -->
        <div v-if="activeTab === 'base64'" class="pane-content">
          <textarea 
            v-model="base64Input" 
            placeholder="在此粘贴您的 Base64 密文段落..." 
            rows="5" 
            class="import-textarea"
          ></textarea>
          <div class="pane-actions">
            <span class="pane-hint">在浏览器本地安全离线解码</span>
            <button class="submit-btn" @click="handleBase64">
              <span>解码并导入</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── CSS 变量容错（如项目中未定义，自动回退到优雅配色） ─── */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Fira Code", "SF Mono", JetBrains Mono, Monaco, Consolas, monospace;
  --border-color: rgba(0, 0, 0, 0.08);
  --accent: #000000;
  --accent-glow: rgba(0, 0, 0, 0.05);
  --text-primary: #171717;
  --text-secondary: #52525b;
  --text-muted: #8e8e93;
  --bg-panel: rgba(255, 255, 255, 0.85);
  --bg-app: #f4f4f5;
  --bg-input: #ffffff;
}

/* ─── 优化后的主入口触发图标按钮 ─── */
.import-btn-wrap {
  position: relative;
}

.import-btn-wrap .trigger-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #ffffff;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.import-btn-wrap .trigger-icon-btn:hover {
  border-color: rgba(0, 0, 0, 0.16);
  background: #fbfbfb;
  transform: translateY(-0.5px);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 4px 12px rgba(0, 0, 0, 0.05);
}

.import-btn-wrap .trigger-icon-btn:active {
  transform: scale(0.96) translateY(0);
}

.import-btn-wrap .trigger-icon-btn .btn-icon {
  width: 15px;
  height: 15px;
  color: var(--text-secondary, #52525b);
}

/* 主触发按钮 — 与复制/清空按钮风格统一 */
.import-btn-wrap .trigger-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--action-btn-bg, #fff);
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: transform 0.1s ease, background-color 0.15s ease;
}
.import-btn-wrap .trigger-icon-btn:hover {
  background: var(--bg-app);
}
.import-btn-wrap .trigger-icon-btn:active {
  transform: scale(0.95);
}
.import-btn-wrap .trigger-icon-btn .btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
/* 暗色模式触发按钮 */
.dark-mode .import-btn-wrap .trigger-icon-btn {
  background: #18181b;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.2);
}
.dark-mode .import-btn-wrap .trigger-icon-btn:hover {
  background: #202024;
  border-color: rgba(255, 255, 255, 0.16);
}

/* ─── 下拉气泡面板（Retina 视网膜玻璃材质） ─── */
.import-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 350px; /* 大气的横向宽度，粘贴多行文本极为惬意 */
  background: var(--bg-panel, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  box-shadow: 
    0 12px 30px -4px rgba(0, 0, 0, 0.08), 
    0 4px 12px -2px rgba(0, 0, 0, 0.03);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}
.import-dropdown.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ─── macOS Inset Segmented Tabs ─── */
.import-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  padding: 2.5px;
  gap: 2px;
}
.dark-mode .import-tabs {
  background: rgba(255, 255, 255, 0.04);
}
.tab-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5.5px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #52525b);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.tab-btn:hover {
  color: var(--text-primary, #111111);
}
.tab-btn.active {
  background: #ffffff;
  color: var(--text-primary, #111111);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.04), 
    0 1px 1px rgba(0, 0, 0, 0.02);
}
.dark-mode .tab-btn.active {
  background: rgba(255, 255, 255, 0.08);
}
.tab-icon {
  width: 12px;
  height: 12px;
}

/* ─── 统一高度内容区 ─── */
.import-panes {
  min-height: 172px; /* 锁死最小高度，切换时不抖动，顺滑无比 */
  display: flex;
  flex-direction: column;
}
.pane-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* ─── 拖拽上传区域（UI 深度优化） ─── */
.file-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  padding: 26px 16px;
  background: rgba(0, 0, 0, 0.005);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}
.file-drop-zone:hover,
.file-drop-zone.dragging {
  border-color: var(--accent, #000000);
  background: rgba(0, 102, 204, 0.015);
}
.drop-icon {
  width: 24px;
  height: 24px;
  color: var(--text-muted, #8e8e93);
  margin-bottom: 8px;
  transition: transform 0.2s, color 0.15s;
}
.file-drop-zone:hover .drop-icon {
  transform: translateY(-2px); /* 高级微动效：小云朵向上悬浮漂流 */
  color: var(--accent, #000000);
}
.drop-title {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-primary, #111111);
  margin-bottom: 2px;
}
.drop-title span {
  color: var(--accent, #000000);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.drop-desc {
  font-size: 10px;
  color: var(--text-muted, #8e8e93);
}

/* ─── 绝美磨砂单色输入框/文本框 ─── */
.import-textarea,
.import-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 6px;
  background: var(--bg-input, #ffffff);
  color: var(--text-primary, #111111);
  font-size: 11.5px;
  font-family: var(--font-mono);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.import-textarea {
  resize: none; 
}
.import-input {
  height: 34px;
}
.import-textarea:focus,
.import-input:focus {
  border-color: var(--accent, #000000);
  box-shadow: 0 0 0 2px var(--accent-glow, rgba(0, 0, 0, 0.04)); /* 细腻的双环聚焦高光 */
}

/* ─── 底部 Action 栏 ─── */
.pane-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}
.pane-hint {
  font-size: 10px;
  color: var(--text-muted, #8e8e93);
  line-height: 1.35;
  max-width: 60%;
}

/* ─── 重新设计的 Linear 风格带微光折折折叠按钮（大气、极度质感） ─── */
.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  /* 带有极轻微立体感渐变和顶部白边微光的优雅深色物理按键 */
  background: linear-gradient(to bottom, #27272a, #0f172a); 
  border: 1px solid #0f172a;
  color: #ffffff;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.15), 
    0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #3f3f46, #1e293b);
  transform: translateY(-0.5px);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.2), 
    0 4px 12px rgba(0, 0, 0, 0.08);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.97) translateY(0);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none !important;
}

/* 暗色模式下按钮变为极致对比亮白按键（Linear 灵魂） */
.dark-mode .submit-btn {
  background: linear-gradient(to bottom, #ffffff, #f4f4f5);
  border: 1px solid #e4e4e7;
  color: #000000;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.6), 
    0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark-mode .submit-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #fafafa, #e4e4e7);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.8), 
    0 4px 12px rgba(255, 255, 255, 0.08);
}

/* ─── 动效 ─── */
.spinner {
  width: 12px;
  height: 12px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.hidden-input {
  position: absolute;
  width: 0; height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>