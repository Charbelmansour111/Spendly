import { useEffect, useRef } from 'react'

const KEYFRAMES = `
@keyframes aurora-a{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(18px,-22px) scale(1.05)}50%{transform:translate(-12px,14px) scale(0.96)}75%{transform:translate(22px,10px) scale(1.03)}}
@keyframes aurora-b{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,18px) scale(1.07)}66%{transform:translate(20px,-12px) scale(0.94)}}
@keyframes aurora-c{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(14px,28px) scale(1.04)}}
`

const VARIANTS = {
  dashboard:    [['124,58,237',0.13,'aurora-a',19,0],['245,158,11',0.09,'aurora-b',23,4],['109,40,217',0.10,'aurora-c',17,8]],
  transactions: [['124,58,237',0.12,'aurora-a',20,0],['59,130,246',0.09,'aurora-b',25,5],['99,102,241',0.10,'aurora-c',18,9]],
  budgets:      [['124,58,237',0.12,'aurora-a',21,0],['16,185,129',0.09,'aurora-b',19,4],['5,150,105', 0.08,'aurora-c',22,8]],
  goals:        [['124,58,237',0.13,'aurora-a',19,0],['236,72,153',0.09,'aurora-b',24,4],['167,139,250',0.10,'aurora-c',17,7]],
  reports:      [['124,58,237',0.12,'aurora-a',21,0],['99,102,241',0.10,'aurora-b',26,5],['67,56,202', 0.09,'aurora-c',18,9]],
  wellness:     [['124,58,237',0.12,'aurora-a',20,0],['20,184,166',0.09,'aurora-b',23,4],['6,182,212', 0.08,'aurora-c',17,8]],
  networth:     [['124,58,237',0.13,'aurora-a',22,0],['234,179,8', 0.09,'aurora-b',20,5],['161,98,7',  0.08,'aurora-c',18,9]],
  profile:      [['124,58,237',0.12,'aurora-a',20,0],['167,139,250',0.10,'aurora-b',24,4],['139,92,246',0.09,'aurora-c',17,8]],
  subscriptions:[['124,58,237',0.12,'aurora-a',21,0],['168,85,247', 0.09,'aurora-b',23,5],['109,40,217',0.09,'aurora-c',19,8]],
}

const POSITIONS = [
  { left: '5%',  top: '-40px', w: 520, h: 420 },
  { right: '8%', top: '-20px', w: 420, h: 360 },
  { left: '38%', top: '60px',  w: 380, h: 300 },
]

export function AuroraBg({ variant = 'dashboard' }) {
  const blobs = VARIANTS[variant] || VARIANTS.dashboard
  return (
    <div className="absolute inset-x-0 top-0 h-80 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <style>{KEYFRAMES}</style>
      {blobs.map(([rgb, opacity, anim, dur, delay], i) => (
        <div key={i} style={{
          position: 'absolute',
          ...POSITIONS[i],
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, rgba(${rgb},${opacity}) 0%, transparent 72%)`,
          filter: 'blur(72px)',
          animation: `${anim} ${dur}s ease-in-out ${delay}s infinite`,
          willChange: 'transform',
        }} />
      ))}
    </div>
  )
}

export function AuthCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: Math.random() * 1.8 + 0.6,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > W()) { p.x = W(); p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > H()) { p.y = H(); p.vy *= -1 }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
          if (d < 128) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(196,181,253,${(1 - d / 128) * 0.22})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(221,214,254,0.65)'
        ctx.fill()
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
