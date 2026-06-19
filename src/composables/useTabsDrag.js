import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

export function useTabsDrag(activeId) {
  const tabsListRef = ref(null)
  const tabsOverflow = ref(false)
  const drag = { active: false, startX: 0, scrollLeft: 0 }

  const checkOverflow = () => {
    const el = tabsListRef.value
    if (!el) return
    tabsOverflow.value = el.scrollWidth > el.clientWidth
  }

  let resizeObs = null

  const onMouseDown = (e) => {
    if (e.target.closest('.tab-close-btn')) return
    const el = tabsListRef.value
    if (!el) return
    drag.active = true
    drag.startX = e.pageX
    drag.scrollLeft = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }

  const onMouseMove = (e) => {
    if (!drag.active) return
    const el = tabsListRef.value
    if (!el) return
    el.scrollLeft = drag.scrollLeft - (e.pageX - drag.startX)
  }

  const onMouseUp = () => {
    if (!drag.active) return
    drag.active = false
    const el = tabsListRef.value
    if (!el) return
    el.style.cursor = ''
    el.style.userSelect = ''
  }

  const onWheel = (e) => {
    const el = tabsListRef.value
    if (el) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  }

  const scrollToEnd = () => {
    nextTick(() => {
      const el = tabsListRef.value
      if (el) el.scrollLeft = el.scrollWidth
      checkOverflow()
    })
  }

  const scrollToActive = () => {
    nextTick(() => {
      const el = tabsListRef.value
      if (!el) return
      const active = el.querySelector('.compare-tab.active')
      if (!active) return
      const elRect = el.getBoundingClientRect()
      const tabRect = active.getBoundingClientRect()
      if (tabRect.left < elRect.left) {
        el.scrollLeft += tabRect.left - elRect.left
      } else if (tabRect.right > elRect.right) {
        el.scrollLeft += tabRect.right - elRect.right
      }
    })
  }

  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    nextTick(() => {
      const el = tabsListRef.value
      if (el) {
        resizeObs = new ResizeObserver(checkOverflow)
        resizeObs.observe(el)
      }
      checkOverflow()
    })
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (resizeObs) resizeObs.disconnect()
  })

  if (activeId) {
    watch(activeId, () => scrollToActive())
  }

  return { tabsListRef, tabsOverflow, onMouseDown, onWheel, scrollToEnd, scrollToActive, checkOverflow }
}
