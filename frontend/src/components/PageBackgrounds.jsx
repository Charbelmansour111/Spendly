import { useEffect, useRef } from 'react'

const FIXED = {
  position: 'fixed', top: 0, left: 0,
  width: '100%', height: '100%',
  zIndex: 0, pointerEvents: 'none',
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

    const SYMS = ['$', '$', '$', '$', '↑', '◆', '●', '€', '$', '↑']
    const COLS = ['#F59E0B', '#10B981', '#6366F1', '#EAB308', '#F59E0B', '#059669', '#D97706']

    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      sym: SYMS[Math.floor(Math.random() * SYMS.length)],
      col: COLS[Math.floor(Math.random() * COLS.length)],
      fs: Math.random() * 18 + 9,
      vy: -(Math.random() * 0.5 + 0.15),
      vx: (Math.random() - 0.5) * 0.22,
      op: Math.random() * 0.55 + 0.25,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.015,
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
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.45 }} />
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
    const N_STREAMS = 12

    const streams = Array.from({ length: N_STREAMS }, (_, i) => {
      const frac = (i + 1) / (N_STREAMS + 1)
      return {
        y: H() * frac,
        col: COLS[i % COLS.length],
        lineOp: Math.random() * 0.12 + 0.06,
        dots: Array.from({ length: 8 }, (_, j) => ({
          x: (window.innerWidth / 8) * j + Math.random() * 40,
          speed: Math.random() * 1.8 + 0.8,
          r: Math.random() * 3 + 2,
          op: Math.random() * 0.65 + 0.30,
          col: COLS[Math.floor(Math.random() * COLS.length)],
        })),
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const s of streams) {
        ctx.beginPath()
        ctx.moveTo(0, s.y); ctx.lineTo(W(), s.y)
        ctx.strokeStyle = s.col; ctx.globalAlpha = s.lineOp; ctx.lineWidth = 1.2
        ctx.stroke()
        for (const d of s.dots) {
          d.x += d.speed
          if (d.x > W() + 20) d.x = -20
          ctx.globalAlpha = d.op * 0.30
          ctx.fillStyle = d.col
          ctx.beginPath(); ctx.arc(d.x, s.y, d.r * 3.5, 0, Math.PI * 2); ctx.fill()
          ctx.globalAlpha = d.op
          ctx.beginPath(); ctx.arc(d.x, s.y, d.r, 0, Math.PI * 2); ctx.fill()
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.42 }} />
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

    const COLS = ['#10B981', '#F59E0B', '#34D399', '#FBBF24', '#6EE7B7', '#D97706', '#059669']
    const bars = Array.from({ length: 24 }, () => ({
      x: Math.random() * window.innerWidth,
      baseH: Math.random() * 110 + 35,
      w: Math.random() * 22 + 10,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      op: Math.random() * 0.35 + 0.18,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.022 + 0.008,
    }))

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, W(), H())
      for (const b of bars) {
        const h = b.baseH * (0.60 + 0.40 * Math.sin(t * b.speed + b.phase))
        const y = H() - h
        const rad = Math.min(b.w / 2, 6)
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
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.40 }} />
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

    const COLS = ['#10B981', '#F59E0B', '#34D399', '#FBBF24', '#6EE7B7', '#FCD34D', '#059669']
    const INNER = ['★', '✓', '★', '●', '✓', '★', '◆']
    const bubs = Array.from({ length: 65 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight + window.innerHeight,
      r: Math.random() * 18 + 6,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      sym: INNER[Math.floor(Math.random() * INNER.length)],
      vy: -(Math.random() * 0.55 + 0.18),
      vx: (Math.random() - 0.5) * 0.18,
      op: Math.random() * 0.45 + 0.20,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const b of bubs) {
        b.x += b.vx; b.y += b.vy
        if (b.y < -50) { b.y = H() + 50; b.x = Math.random() * W() }
        ctx.globalAlpha = b.op
        ctx.strokeStyle = b.col; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        if (b.r > 9) {
          ctx.globalAlpha = b.op * 0.80
          ctx.fillStyle = b.col
          ctx.font = `${b.r * 1.0}px system-ui`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(b.sym, b.x, b.y)
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.45 }} />
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

    const COLS = ['#7C3AED', '#6366F1', '#8B5CF6', '#4F46E5', '#A78BFA', '#9333EA', '#C084FC']
    const systems = Array.from({ length: 9 }, () => ({
      cx: Math.random() * window.innerWidth,
      cy: Math.random() * window.innerHeight,
      orbits: Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, i) => ({
        radius: (i + 1) * (Math.random() * 26 + 20),
        speed: (Math.random() * 0.011 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        dotR: Math.random() * 4 + 2,
        col: COLS[Math.floor(Math.random() * COLS.length)],
        op: Math.random() * 0.55 + 0.25,
        ringOp: Math.random() * 0.12 + 0.06,
      })),
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const sys of systems) {
        for (const o of sys.orbits) {
          o.angle += o.speed
          ctx.globalAlpha = o.ringOp
          ctx.strokeStyle = o.col; ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(sys.cx, sys.cy, o.radius, 0, Math.PI * 2); ctx.stroke()
          const dx = sys.cx + Math.cos(o.angle) * o.radius
          const dy = sys.cy + Math.sin(o.angle) * o.radius
          ctx.globalAlpha = o.op * 0.30
          ctx.fillStyle = o.col
          ctx.beginPath(); ctx.arc(dx, dy, o.dotR * 3.2, 0, Math.PI * 2); ctx.fill()
          ctx.globalAlpha = o.op
          ctx.beginPath(); ctx.arc(dx, dy, o.dotR, 0, Math.PI * 2); ctx.fill()
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.45 }} />
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
      { amp: 70, freq: 0.008, speed: 0.024, yFrac: 0.30, col: '#10B981', op: 0.40, lw: 2.8, fillOp: 0.10 },
      { amp: 55, freq: 0.010, speed: 0.018, yFrac: 0.50, col: '#34D399', op: 0.28, lw: 2.0, fillOp: 0.07 },
      { amp: 40, freq: 0.013, speed: 0.030, yFrac: 0.70, col: '#6EE7B7', op: 0.18, lw: 1.4, fillOp: 0.04 },
    ]

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, W(), H())
      const w = W(), h = H()
      for (const wv of WAVES) {
        const baseY = h * wv.yFrac
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = baseY + Math.sin(x * wv.freq + t * wv.speed) * wv.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.globalAlpha = wv.op
        ctx.strokeStyle = wv.col; ctx.lineWidth = wv.lw
        ctx.stroke()
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
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.45 }} />
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

    function ekgY(pos) {
      const cycle = 130
      const p = ((pos % cycle) + cycle) % cycle
      if (p < 25) return 0
      if (p < 32) return -8
      if (p < 38) return 16
      if (p < 44) return -52
      if (p < 50) return 26
      if (p < 62) return -5
      return 0
    }

    const LINES = [
      { yFrac: 0.25, col: '#10B981', op: 0.50, lw: 2.4, off: 0 },
      { yFrac: 0.50, col: '#34D399', op: 0.32, lw: 1.8, off: 65 },
      { yFrac: 0.75, col: '#6EE7B7', op: 0.20, lw: 1.2, off: 32 },
    ]

    let phase = 0
    const draw = () => {
      phase += 1.5
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
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.48 }} />
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

    const COLS = ['#F59E0B', '#EAB308', '#D97706', '#FBBF24', '#F59E0B']
    const coins = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 11 + 5,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      op: Math.random() * 0.30 + 0.14,
      vy: -(Math.random() * 0.35 + 0.10),
      vx: (Math.random() - 0.5) * 0.12,
    }))

    let chartPts = [], tRefresh = 0
    const genChart = () => {
      const n = 10, w = window.innerWidth, h = window.innerHeight
      let y = h * 0.72
      chartPts = Array.from({ length: n }, (_, i) => {
        y -= Math.random() * h * 0.048
        return { x: (w / (n - 1)) * i, y }
      })
    }
    genChart()

    const draw = () => {
      tRefresh++
      if (tRefresh % 720 === 0) genChart()
      ctx.clearRect(0, 0, W(), H())
      if (chartPts.length > 1) {
        ctx.beginPath()
        ctx.moveTo(chartPts[0].x, chartPts[0].y)
        for (let i = 1; i < chartPts.length; i++) {
          const mx = (chartPts[i - 1].x + chartPts[i].x) / 2
          const my = (chartPts[i - 1].y + chartPts[i].y) / 2
          ctx.quadraticCurveTo(chartPts[i - 1].x, chartPts[i - 1].y, mx, my)
        }
        ctx.lineTo(chartPts[chartPts.length - 1].x, chartPts[chartPts.length - 1].y)
        ctx.globalAlpha = 0.28; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2.5
        ctx.stroke()
      }
      for (const coin of coins) {
        coin.x += coin.vx; coin.y += coin.vy
        if (coin.y < -30) { coin.y = H() + 30; coin.x = Math.random() * W() }
        ctx.globalAlpha = coin.op * 0.45; ctx.fillStyle = coin.col
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = coin.op; ctx.strokeStyle = coin.col; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); ctx.stroke()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.45 }} />
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

    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 2.5 + 1,
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
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = '#A78BFA'; ctx.globalAlpha = (1 - d / 120) * 0.30; ctx.lineWidth = 0.9; ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = '#A78BFA'; ctx.globalAlpha = 0.50; ctx.fill()
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={r} style={{ ...FIXED, opacity: 0.42 }} />
}
