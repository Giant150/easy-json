// easyJSON — Chrome Extension Background Service Worker
// Handles right-click context menu for smart JSON extraction & comparison

// SW 每次冷启动时尝试创建右键菜单。
// Chrome 会自动还原旧的菜单项，这里重复 create 会触发 duplicate-id 错误，
// 用 callback 吞掉即可 — 菜单项实际只有一个，不影响使用。
chrome.contextMenus.create({
  id: 'extract-json',
  title: '用 easyJSON 智能提取',
  contexts: ['selection']
}, () => void chrome.runtime.lastError)

chrome.contextMenus.create({
  id: 'compare-json',
  title: '用 easyJSON 直接对比',
  contexts: ['selection']
}, () => void chrome.runtime.lastError)

// 点击插件图标 → 在新标签页全屏打开（复用已有标签页）
chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('index.html?mode=tab')
  chrome.tabs.query({ url: chrome.runtime.getURL('index.html') + '*' }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true })
    } else {
      chrome.tabs.create({ url })
    }
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return

  const extensionUrl = chrome.runtime.getURL('index.html')

  if (info.menuItemId === 'extract-json') {
    chrome.storage.local.set({ ej_extract_text: info.selectionText }, () => {
      chrome.tabs.query({ url: extensionUrl + '*' }, (tabs) => {
        if (tabs.length > 0) {
          // 不设置 url，避免重载，通过 storage.onChanged 推送
          chrome.tabs.update(tabs[0].id, { active: true })
        } else {
          chrome.tabs.create({ url: extensionUrl + '?action=extract' })
        }
      })
    })
  } else if (info.menuItemId === 'compare-json') {
    chrome.storage.local.set({ ej_compare_text: info.selectionText }, () => {
      chrome.tabs.query({ url: extensionUrl + '*' }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true })
        } else {
          chrome.tabs.create({ url: extensionUrl + '?action=compare' })
        }
      })
    })
  }
})
