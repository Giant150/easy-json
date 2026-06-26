import { ref, onMounted } from 'vue'

export function useInstallCheck() {
  const needsInstall = ref(false)

  onMounted(async () => {
    // 只在 Tauri 环境检测
    if (!window.__TAURI__ && !window.__TAURI_INTERNALS__) return

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const installed = await invoke('is_installed')
      if (!installed) {
        needsInstall.value = true
      }
    } catch (_) {
      // 静默失败
    }
  })

  return { needsInstall }
}
