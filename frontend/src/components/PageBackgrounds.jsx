import { useEffect, useRef } from 'react'

const FIXED = {
  position: 'fixed', top: 0, left: 0,
  width: '100%', height: '100%',
  zIndex: -1, pointerEvents: 'none',
}

function useCanvasSetup(ref) {
  const W = () => window.innerWidth
  const H = () => window.innerHeight
  return { W, H }
}

// ─────────────────────────────────────────────────────────
// Dashboard — floating money particles ($, ↑, ◆, ●)
// Colors: gold / green / indigo
// ─────────────────────────────────────────────────────────
export function DashboardBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const SYMS = ['$', '$', '$', '$', '↑', '◆', '●', '€', '$']
    const COLS = ['#F59E0B', '#10B981', '#6366F1', '#EAB308', '#F59E0B', '#059669']

    const pts = Array.from({ length: 75 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      sym: SYMS[Math.floor(Math.random() * SYMS.length)],
      col: COLS[Math.floor(Math.random() * COLS.length)],
      fs: Math.random() * 14 + 7,
      vy: -(Math.random() * 0.45 + 0.13),
      vx: (Math.random() - 0.5) * 0.18,
      op: Math.random() * 0.38 + 0.10,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.012,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv
        if (p.y < -60) { p.y = H() + 60; p.x = Math.random() * W() }
        if (p.x < -30 || p.x > W() + 30) { p.x = Math.random() * W(); p.y = H() + 60 }
        ctx.save()
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.globalAlpha = p.op
        ctx.fillStyle = p.col
        ctx.font = `bold ${p.fs}px system-ui, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(p.sym, 0, 0)
        ctx.restore()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}

// ─────────────────────────────────────────────────────────
// Transactions — flowing data streams with traveling dots
// Colors: indigo / purple
// ─────────────────────────────────────────────────────────
export function TransactionsBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const COLS = ['#6366F1', '#7C3AED', '#8B5CF6', '#4F46E5', '#A78BFA']
    const N_STREAMS = 10

    const streams = Array.from({ length: N_STREAMS }, (_, i) => {
      const frac = (i + 1) / (N_STREAMS + 1)
      return {
        y: H() * frac,
        col: COLS[i % COLS.length],
        lineOp: Math.random() * 0.06 + 0.03,
        dots: Array.from({ length: 7 }, (_, j) => ({
          x: (window.innerWidth / 7) * j + Math.random() * 40,
          speed: Math.random() * 1.5 + 0.7,
          r: Math.random() * 2.5 + 1.5,
          op: Math.random() * 0.45 + 0.18,
          col: COLS[Math.floor(Math.random() * COLS.length)],
        })),
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const s of streams) {
        // lane line
        ctx.beginPath()
        ctx.moveTo(0, s.y); ctx.lineTo(W(), s.y)
        ctx.strokeStyle = s.col; ctx.globalAlpha = s.lineOp; ctx.lineWidth = 1
        ctx.stroke()
        // traveling dots
        for (const d of s.dots) {
          d.x += d.speed
          if (d.x > W() + 20) d.x = -20
          // glow
          ctx.globalAlpha = d.op * 0.25
          ctx.fillStyle = d.col
          ctx.beginPath(); ctx.arc(d.x, s.y, d.r * 3, 0, Math.PI * 2); ctx.fill()
          // core
          ctx.globalAlpha = d.op
          ctx.beginPath(); ctx.arc(d.x, s.y, d.r, 0, Math.PI * 2); ctx.fill()
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.20 }} />
}

// ─────────────────────────────────────────────────────────
// Budgets — pulsing bar chart bars anchored to bottom
// Colors: green / amber
// ─────────────────────────────────────────────────────────
export function BudgetsBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const COLS = ['#10B981', '#F59E0B', '#34D399', '#FBBF24', '#6EE7B7', '#D97706']
    const bars = Array.from({ length: 22 }, () => ({
      x: Math.random() * window.innerWidth,
      baseH: Math.random() * 90 + 30,
      w: Math.random() * 18 + 8,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      op: Math.random() * 0.22 + 0.08,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.018 + 0.006,
    }))

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, W(), H())
      for (const b of bars) {
        const h = b.baseH * (0.65 + 0.35 * Math.sin(t * b.speed + b.phase))
        const y = H() - h
        const rad = Math.min(b.w / 2, 5)
        ctx.globalAlpha = b.op
        ctx.fillStyle = b.col
        ctx.beginPath()
        ctx.moveTo(b.x + rad, y)
        ctx.lineTo(b.x + b.w - rad, y)
        ctx.arcTo(b.x + b.w, y, b.x + b.w, y + rad, rad)
        ctx.lineTo(b.x + b.w, H())
        ctx.lineTo(b.x, H())
        ctx.lineTo(b.x, y + rad)
        ctx.arcTo(b.x, y, b.x + rad, y, rad)
        ctx.closePath()
        ctx.fill()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.18 }} />
}

// ─────────────────────────────────────────────────────────
// Goals — rising bubbles with ★ / ✓ symbols
// Colors: emerald / gold
// ─────────────────────────────────────────────────────────
export function GoalsBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const COLS = ['#10B981', '#F59E0B', '#34D399', '#FBBF24', '#6EE7B7', '#FCD34D']
    const INNER = ['★', '✓', '★', '●', '✓', '★']
    const bubs = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight + window.innerHeight,
      r: Math.random() * 16 + 5,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      sym: INNER[Math.floor(Math.random() * INNER.length)],
      vy: -(Math.random() * 0.5 + 0.15),
      vx: (Math.random() - 0.5) * 0.15,
      op: Math.random() * 0.30 + 0.08,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const b of bubs) {
        b.x += b.vx; b.y += b.vy
        if (b.y < -50) { b.y = H() + 50; b.x = Math.random() * W() }
        ctx.globalAlpha = b.op
        ctx.strokeStyle = b.col; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        if (b.r > 9) {
          ctx.globalAlpha = b.op * 0.75
          ctx.fillStyle = b.col
          ctx.font = `${b.r * 0.95}px system-ui`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(b.sym, b.x, b.y)
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}

// ─────────────────────────────────────────────────────────
// Subscriptions — orbiting dots around invisible centers
// Colors: purple / indigo
// ─────────────────────────────────────────────────────────
export function SubscriptionsBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const COLS = ['#7C3AED', '#6366F1', '#8B5CF6', '#4F46E5', '#A78BFA', '#9333EA']
    const systems = Array.from({ length: 8 }, () => ({
      cx: Math.random() * window.innerWidth,
      cy: Math.random() * window.innerHeight,
      orbits: Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, i) => ({
        radius: (i + 1) * (Math.random() * 22 + 18),
        speed: (Math.random() * 0.009 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        dotR: Math.random() * 3 + 1.5,
        col: COLS[Math.floor(Math.random() * COLS.length)],
        op: Math.random() * 0.42 + 0.14,
        ringOp: Math.random() * 0.07 + 0.03,
      })),
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const sys of systems) {
        for (const o of sys.orbits) {
          o.angle += o.speed
          // ring
          ctx.globalAlpha = o.ringOp
          ctx.strokeStyle = o.col; ctx.lineWidth = 0.8
          ctx.beginPath(); ctx.arc(sys.cx, sys.cy, o.radius, 0, Math.PI * 2); ctx.stroke()
          // dot
          const dx = sys.cx + Math.cos(o.angle) * o.radius
          const dy = sys.cy + Math.sin(o.angle) * o.radius
          ctx.globalAlpha = o.op * 0.22
          ctx.fillStyle = o.col
          ctx.beginPath(); ctx.arc(dx, dy, o.dotR * 2.8, 0, Math.PI * 2); ctx.fill()
          ctx.globalAlpha = o.op
          ctx.beginPath(); ctx.arc(dx, dy, o.dotR, 0, Math.PI * 2); ctx.fill()
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}

// ─────────────────────────────────────────────────────────
// Reports — flowing sine waves (multi-layer)
// Colors: green gradient
// ─────────────────────────────────────────────────────────
export function ReportsBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const WAVES = [
      { amp: 65, freq: 0.008, speed: 0.022, yFrac: 0.32, col: '#10B981', op: 0.22, lw: 2.2, fillOp: 0.04 },
      { amp: 48, freq: 0.010, speed: 0.016, yFrac: 0.50, col: '#34D399', op: 0.15, lw: 1.6, fillOp: 0.03 },
      { amp: 36, freq: 0.013, speed: 0.028, yFrac: 0.68, col: '#6EE7B7', op: 0.10, lw: 1.0, fillOp: 0.02 },
    ]

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, W(), H())
      const w = W(), h = H()
      for (const wv of WAVES) {
        const baseY = h * wv.yFrac
        // wave line
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = baseY + Math.sin(x * wv.freq + t * wv.speed) * wv.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.globalAlpha = wv.op
        ctx.strokeStyle = wv.col; ctx.lineWidth = wv.lw
        ctx.stroke()
        // fill below
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 2) {
          const y = baseY + Math.sin(x * wv.freq + t * wv.speed) * wv.amp
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h); ctx.closePath()
        ctx.globalAlpha = wv.fillOp
        ctx.fillStyle = wv.col; ctx.fill()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}

// ─────────────────────────────────────────────────────────
// Wellness — EKG heartbeat lines scrolling across
// Colors: green / white
// ─────────────────────────────────────────────────────────
export function WellnessBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    // EKG shape: flat → bump → big spike → flat
    function ekgY(pos) {
      const cycle = 130
      const p = ((pos % cycle) + cycle) % cycle
      if (p < 25) return 0
      if (p < 32) return -7
      if (p < 38) return 14
      if (p < 44) return -45
      if (p < 50) return 22
      if (p < 62) return -4
      return 0
    }

    const LINES = [
      { yFrac: 0.28, col: '#10B981', op: 0.26, lw: 2.0, off: 0 },
      { yFrac: 0.55, col: '#34D399', op: 0.16, lw: 1.4, off: 65 },
      { yFrac: 0.78, col: '#6EE7B7', op: 0.10, lw: 1.0, off: 30 },
    ]

    let phase = 0
    const draw = () => {
      phase += 1.4
      ctx.clearRect(0, 0, W(), H())
      for (const ln of LINES) {
        const baseY = H() * ln.yFrac
        ctx.beginPath()
        for (let x = 0; x <= W(); x++) {
          const y = baseY + ekgY(x - phase + ln.off)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.globalAlpha = ln.op
        ctx.strokeStyle = ln.col; ctx.lineWidth = ln.lw
        ctx.stroke()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.24 }} />
}

// ─────────────────────────────────────────────────────────
// NetWorth — gentle upward chart line + floating gold coins
// Colors: gold / amber
// ─────────────────────────────────────────────────────────
export function NetWorthBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const COLS = ['#F59E0B', '#EAB308', '#D97706', '#FBBF24']
    const coins = Array.from({ length: 35 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 9 + 4,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      op: Math.random() * 0.18 + 0.05,
      vy: -(Math.random() * 0.3 + 0.08),
      vx: (Math.random() - 0.5) * 0.1,
    }))

    // Smooth upward chart
    let chartPts = [], tRefresh = 0
    const genChart = () => {
      const n = 10, w = window.innerWidth, h = window.innerHeight
      let y = h * 0.72
      chartPts = Array.from({ length: n }, (_, i) => {
        y -= Math.random() * h * 0.04
        return { x: (w / (n - 1)) * i, y }
      })
    }
    genChart()

    const draw = () => {
      tRefresh++
      if (tRefresh % 720 === 0) genChart()
      ctx.clearRect(0, 0, W(), H())
      // chart line
      if (chartPts.length > 1) {
        ctx.beginPath()
        ctx.moveTo(chartPts[0].x, chartPts[0].y)
        for (let i = 1; i < chartPts.length; i++) {
          const mx = (chartPts[i - 1].x + chartPts[i].x) / 2
          const my = (chartPts[i - 1].y + chartPts[i].y) / 2
          ctx.quadraticCurveTo(chartPts[i - 1].x, chartPts[i - 1].y, mx, my)
        }
        ctx.lineTo(chartPts[chartPts.length - 1].x, chartPts[chartPts.length - 1].y)
        ctx.globalAlpha = 0.12; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2
        ctx.stroke()
      }
      // coins
      for (const coin of coins) {
        coin.x += coin.vx; coin.y += coin.vy
        if (coin.y < -30) { coin.y = H() + 30; coin.x = Math.random() * W() }
        ctx.globalAlpha = coin.op * 0.4; ctx.fillStyle = coin.col
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = coin.op; ctx.strokeStyle = coin.col; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); ctx.stroke()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}

// ─────────────────────────────────────────────────────────
// Profile — subtle particle network (violet/lavender)
// ─────────────────────────────────────────────────────────
export function ProfileBg() {
  const r = useRef(null)
  useEffect(() => {
    const c = r.current; if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let id
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const W = () => window.innerWidth, H = () => window.innerHeight

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 2 + 0.8,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W()) p.vx *= -1
        if (p.y < 0 || p.y > H()) p.vy *= -1
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
          if (d < 115) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = '#A78BFA'; ctx.globalAlpha = (1 - d / 115) * 0.18; ctx.lineWidth = 0.8; ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = '#A78BFA'; ctx.globalAlpha = 0.32; ctx.fill()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.22 }} />
}
