import { ref, onMounted } from 'vue'

const APP_VERSION = '1.0.0'

const GITHUB_API = 'https://api.github.com/repos/chengxy-nds/easy-json/releases/latest'
const DOWNLOAD_URL = 'https://github.com/repos/chengxy-nds/easy-json/releases/latest'

export function useUpdateCheck() {
  const hasUpdate = ref(false)
  const latestVersion = ref('')
  const downloadUrl = ref(DOWNLOAD_URL)

  const check = async () => {
    try {
      const res = await fetch(GITHUB_API, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      })
      if (!res.ok) return
      const release = await res.json()
      const tag = release.tag_name || ''
      // 去掉 v 前缀: v1.0.1 → 1.0.1
      const remote = tag.replace(/^v/, '')
      if (!remote) return

      // 优先匹配 .exe 下载链接
      const exe = release.assets?.find(a =>
        a.name?.endsWith('.exe') || a.name?.endsWith('-setup.exe')
      )
      if (exe?.browser_download_url) {
        downloadUrl.value = exe.browser_download_url
      }

      hasUpdate.value = compareVersions(remote, APP_VERSION) > 0
      latestVersion.value = remote
    } catch (_) {
      // 静默失败
    }
  }

  // 简单 semver 比较 (支持 x.y.z)
  const compareVersions = (a, b) => {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const da = pa[i] || 0
      const db = pb[i] || 0
      if (da > db) return 1
      if (da < db) return -1
    }
    return 0
  }

  onMounted(check)

  return { hasUpdate, latestVersion, downloadUrl, check }
}
