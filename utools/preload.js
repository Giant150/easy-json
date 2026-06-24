window.__UTOOLS__ = true

window.addEventListener('DOMContentLoaded', () => {
  if (typeof utools !== 'undefined') {
    utools.setExpendHeight(600)
    const win = utools.getLocalId && require('electron').remote
      ? require('electron').remote.getCurrentWindow()
      : null
    if (win) {
      const [w] = win.getSize()
      if (w < 1200) win.setSize(1200, 720)
    }
  }
})
