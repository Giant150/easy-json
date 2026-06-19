// 鼠标粒子流光特效（Flow Field Particles）
// Perlin Noise 流场 + 高密度粒子 + 拖尾渐变

const p = new Uint8Array(512)
const G = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]

const seedNoise = () => {
  const buf = new Uint8Array(256)
  for (let i = 0; i < 256; i++) buf[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[buf[i], buf[j]] = [buf[j], buf[i]]
  }
  for (let i = 0; i < 512; i++) p[i] = buf[i & 255]
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)

const noise2D = (x, y) => {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255
  const xf = x - Math.floor(x), yf = y - Math.floor(y)
  const u = fade(xf), v = fade(yf)
  const a = p[p[X] + Y], b = p[p[X + 1] + Y], c = p[p[X] + Y + 1], d = p[p[X + 1] + Y + 1]
  const lerp = (t, a, b) => a + t * (b - a)
  const g = (h, dx, dy) => G[h & 7][0] * dx + G[h & 7][1] * dy
  return lerp(v, lerp(u, g(a, xf, yf), g(b, xf - 1, yf)), lerp(u, g(c, xf, yf - 1), g(d, xf - 1, yf - 1)))
}

class Particle {
  constructor(w, h, mx, my) {
    this.w = w; this.h = h
    this.reset(mx, my)
  }
  reset(mx, my) {
    const r = 80, a = Math.random() * Math.PI * 2
    this.x = mx + Math.cos(a) * r * Math.random()
    this.y = my + Math.sin(a) * r * Math.random()
    this.vx = 0; this.vy = 0
    this.age = 0; this.maxAge = 180 + Math.random() * 360
    this.speed = 0.3 + Math.random() * 0.7
    this.size = 0.4 + Math.random() * 0.6
  }
  update(angle, mx, my) {
    this.age++
    const force = this.speed * (1 - this.age / this.maxAge)
    this.vx += Math.cos(angle) * 0.15; this.vy += Math.sin(angle) * 0.15
    this.vx *= 0.92; this.vy *= 0.92
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (spd > force * 2) { this.vx = this.vx / spd * force * 2; this.vy = this.vy / spd * force * 2 }
    this.x += this.vx; this.y += this.vy
    if (this.age >= this.maxAge || this.x < -50 || this.x > this.w + 50 || this.y < -50 || this.y > this.h + 50) {
      this.reset(mx, my)
    }
  }
}

export function useParticleFlow() {
  let canvas, ctx, offscreen, offCtx, W, H, particles = [], animId, running = false
  let mouse = { x: 0, y: 0 }, t = 0
  const RES = 8, MAX = 4000

  const resize = () => {
    W = canvas.width = offscreen.width = window.innerWidth
    H = canvas.height = offscreen.height = window.innerHeight
  }

  const draw = () => {
    if (!running) return
    t += 0.003
    const cols = Math.floor(W / RES) + 1, rows = Math.floor(H / RES) + 1
    const field = []
    for (let i = 0; i < cols; i++) {
      field[i] = []
      for (let j = 0; j < rows; j++) field[i][j] = noise2D(i * 0.06 + t * 0.3, j * 0.06) * Math.PI * 4
    }
    while (particles.length < MAX) particles.push(new Particle(W, H, mouse.x, mouse.y))
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i]
      const ci = Math.min(Math.max(Math.floor(pt.x / RES), 0), cols - 1)
      const cj = Math.min(Math.max(Math.floor(pt.y / RES), 0), rows - 1)
      pt.update(field[ci]?.[cj] ?? 0, mouse.x, mouse.y)
      const alpha = Math.sin((1 - pt.age / pt.maxAge) * Math.PI)
      offCtx.fillStyle = `rgba(99, 102, 241, ${alpha * 0.7})`
      offCtx.fillRect(pt.x, pt.y, pt.size, pt.size)
    }
    const isDark = document.documentElement.classList.contains('dark-mode')
    ctx.fillStyle = isDark ? 'rgba(24,24,26,0.1)' : 'rgba(255,255,255,0.1)'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(offscreen, 0, 0)
    offCtx.clearRect(0, 0, W, H)
    animId = requestAnimationFrame(draw)
  }

  const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }

  const mount = (container = document.body) => {
    seedNoise(); W = window.innerWidth; H = window.innerHeight
    mouse.x = W / 2; mouse.y = H / 2
    canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:0;pointer-events:none;'
    ctx = canvas.getContext('2d'); canvas.width = W; canvas.height = H
    offscreen = document.createElement('canvas')
    offCtx = offscreen.getContext('2d'); offscreen.width = W; offscreen.height = H
    container.appendChild(canvas)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('resize', resize)
    running = true; draw()
  }

  const unmount = () => {
    running = false
    if (animId) cancelAnimationFrame(animId)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', resize)
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
    particles.length = 0
  }

  return { mount, unmount }
}
