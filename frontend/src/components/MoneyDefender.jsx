import { useEffect, useRef, useState, useCallback } from 'react'

const W = 800
const H = 600
const TILE = 40
const PLAYER_SPEED = 3
const BULLET_SPEED = 10
const ZOMBIE_BASE_SPEED = 0.9

const POWERUP_DEFS = [
  { id: 'speed',   icon: '⚡', name: 'Speed Boost',   color: '#F59E0B', duration: 5000,  cooldown: 15000 },
  { id: 'instakill', icon: '💀', name: 'Insta Kill',  color: '#EF4444', duration: 6000,  cooldown: 20000 },
  { id: 'bomb',    icon: '💣', name: 'Money Bomb',    color: '#8B5CF6', duration: 0,     cooldown: 18000 },
  { id: 'shield',  icon: '🛡️', name: 'Shield',        color: '#3B82F6', duration: 8000,  cooldown: 25000 },
  { id: 'rapidfire', icon: '🔥', name: 'Rapid Fire',  color: '#F97316', duration: 6000,  cooldown: 15000 },
]

function generateMap(level) {
  const cols = Math.floor(W / TILE)
  const rows = Math.floor(H / TILE)
  const barriers = []
  const money = []
  const vaultSide = Math.floor(Math.random() * 4) // 0=top 1=right 2=bottom 3=left
  let vaultX, vaultY

  // Border walls
  for (let c = 0; c < cols; c++) {
    barriers.push({ x: c * TILE, y: 0, w: TILE, h: TILE })
    barriers.push({ x: c * TILE, y: (rows - 1) * TILE, w: TILE, h: TILE })
  }
  for (let r = 1; r < rows - 1; r++) {
    barriers.push({ x: 0, y: r * TILE, w: TILE, h: TILE })
    barriers.push({ x: (cols - 1) * TILE, y: r * TILE, w: TILE, h: TILE })
  }

  // Random barrel clusters
  const barrelCount = 12 + level * 2
  for (let i = 0; i < barrelCount; i++) {
    const bx = (2 + Math.floor(Math.random() * (cols - 4))) * TILE
    const by = (2 + Math.floor(Math.random() * (rows - 4))) * TILE
    const bw = (1 + Math.floor(Math.random() * 2)) * TILE
    const bh = TILE
    barriers.push({ x: bx, y: by, w: bw, h: bh })
    if (Math.random() > 0.5) barriers.push({ x: bx, y: by + TILE, w: TILE, h: TILE })
  }

  // Vault position at edge
  const mid = Math.floor(cols / 2) * TILE
  if (vaultSide === 0)      { vaultX = mid; vaultY = TILE }
  else if (vaultSide === 1) { vaultX = (cols - 2) * TILE; vaultY = Math.floor(rows / 2) * TILE }
  else if (vaultSide === 2) { vaultX = mid; vaultY = (rows - 2) * TILE }
  else                      { vaultX = TILE; vaultY = Math.floor(rows / 2) * TILE }

  // Money bags — not on barriers
  const moneyCount = 5 + level * 2
  for (let i = 0; i < moneyCount; i++) {
    let mx, my, safe
    let tries = 0
    do {
      mx = (2 + Math.floor(Math.random() * (cols - 4))) * TILE + TILE / 2
      my = (2 + Math.floor(Math.random() * (rows - 4))) * TILE + TILE / 2
      safe = !barriers.some(b => mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h)
      tries++
    } while (!safe && tries < 50)
    money.push({ x: mx, y: my, value: 50 + Math.floor(Math.random() * 100), collected: false, pulse: Math.random() * Math.PI * 2 })
  }

  return { barriers, money, vaultX, vaultY, vaultSide }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function drawPixelChar(ctx, x, y, facing, walking, frameCount, hasShield) {
  const f = frameCount
  const legSwing = Math.sin(f * 0.25) * 5
  const armSwing = Math.cos(f * 0.25) * 4
  const bobY = walking ? Math.abs(Math.sin(f * 0.25)) * 2 : 0

  ctx.save()
  ctx.translate(x, y - bobY)

  if (facing === 'left') ctx.scale(-1, 1)

  // Shield ring
  if (hasShield) {
    ctx.beginPath()
    ctx.arc(0, -8, 22, 0, Math.PI * 2)
    ctx.strokeStyle = '#60A5FA'
    ctx.lineWidth = 2.5
    ctx.globalAlpha = 0.6 + Math.sin(f * 0.1) * 0.3
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Shadow
  ctx.fillStyle = '#00000044'
  ctx.beginPath()
  ctx.ellipse(0, 10, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Legs
  ctx.fillStyle = '#1E3A5F'
  ctx.fillRect(-6, 2, 5, 8 + (walking ? legSwing : 0))
  ctx.fillRect(1, 2, 5, 8 - (walking ? legSwing : 0))

  // Shoes
  ctx.fillStyle = '#111827'
  ctx.fillRect(-7, 9 + (walking ? legSwing : 0), 7, 3)
  ctx.fillRect(1, 9 - (walking ? legSwing : 0), 7, 3)

  // Body / suit
  const bodyGrad = ctx.createLinearGradient(-8, -8, 8, 6)
  bodyGrad.addColorStop(0, '#1D4ED8')
  bodyGrad.addColorStop(1, '#1E40AF')
  ctx.fillStyle = bodyGrad
  ctx.fillRect(-8, -8, 16, 12)

  // Suit lapels
  ctx.fillStyle = '#93C5FD'
  ctx.beginPath()
  ctx.moveTo(-2, -8)
  ctx.lineTo(-6, -2)
  ctx.lineTo(0, -2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(2, -8)
  ctx.lineTo(6, -2)
  ctx.lineTo(0, -2)
  ctx.closePath()
  ctx.fill()

  // Tie
  ctx.fillStyle = '#DC2626'
  ctx.fillRect(-1, -6, 2, 8)

  // Arms
  ctx.fillStyle = '#1D4ED8'
  ctx.fillRect(-13, -7 + armSwing, 5, 10)
  ctx.fillRect(8, -7 - armSwing, 5, 10)

  // Hands
  ctx.fillStyle = '#FBBF24'
  ctx.beginPath()
  ctx.arc(-10, 3 + armSwing, 3, 0, Math.PI * 2)
  ctx.fill()

  // Suitcase
  ctx.fillStyle = '#92400E'
  ctx.fillRect(8, -1 - armSwing, 10, 8)
  ctx.strokeStyle = '#78350F'
  ctx.lineWidth = 1
  ctx.strokeRect(8, -1 - armSwing, 10, 8)
  ctx.fillStyle = '#D97706'
  ctx.fillRect(11, -3 - armSwing, 4, 3)

  // Head
  ctx.fillStyle = '#FCD34D'
  ctx.beginPath()
  ctx.arc(0, -16, 9, 0, Math.PI * 2)
  ctx.fill()

  // Hair
  ctx.fillStyle = '#92400E'
  ctx.fillRect(-9, -24, 18, 6)
  ctx.beginPath()
  ctx.arc(0, -24, 9, Math.PI, 0)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#1F2937'
  ctx.beginPath()
  ctx.arc(-3, -17, 2, 0, Math.PI * 2)
  ctx.arc(3, -17, 2, 0, Math.PI * 2)
  ctx.fill()

  // Eye shine
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(-2, -18, 0.8, 0, Math.PI * 2)
  ctx.arc(4, -18, 0.8, 0, Math.PI * 2)
  ctx.fill()

  // Smile
  ctx.strokeStyle = '#92400E'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, -14, 4, 0.2, Math.PI - 0.2)
  ctx.stroke()

  ctx.restore()
}

function drawZombie(ctx, x, y, hp, maxHp, frameCount, type) {
  const bob = Math.sin(frameCount * 0.15) * 3
  ctx.save()
  ctx.translate(x, y + bob)

  const colors = {
    basic:  { body: '#16A34A', skin: '#BBF7D0', suit: '#14532D' },
    fast:   { body: '#DC2626', skin: '#FCA5A5', suit: '#7F1D1D' },
    tank:   { body: '#7C3AED', skin: '#DDD6FE', suit: '#4C1D95' },
    boss:   { body: '#B45309', skin: '#FDE68A', suit: '#78350F' },
  }
  const c = colors[type] || colors.basic

  // Shadow
  ctx.fillStyle = '#00000033'
  ctx.beginPath()
  ctx.ellipse(0, 12, 12, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Legs (shambling)
  const lurch = Math.sin(frameCount * 0.12) * 6
  ctx.fillStyle = c.suit
  ctx.fillRect(-7, 2, 6, 10 + lurch)
  ctx.fillRect(1, 2, 6, 10 - lurch)

  // Body
  ctx.fillStyle = c.body
  ctx.fillRect(-9, -10, 18, 14)

  // Torn clothes effect
  ctx.fillStyle = c.suit
  ctx.fillRect(-9, -10, 5, 14)

  // Arms (outstretched)
  const reach = Math.sin(frameCount * 0.1) * 3
  ctx.fillStyle = c.body
  ctx.fillRect(-16, -8 + reach, 7, 8)
  ctx.fillRect(9, -8 - reach, 7, 8)

  // Head
  ctx.fillStyle = c.skin
  ctx.beginPath()
  ctx.arc(0, -18, 10, 0, Math.PI * 2)
  ctx.fill()

  // Zombie eyes (X eyes)
  ctx.strokeStyle = '#7F1D1D'
  ctx.lineWidth = 2
  ;[[-4, -20], [4, -20]].forEach(([ex, ey]) => {
    ctx.beginPath()
    ctx.moveTo(ex - 2.5, ey - 2.5); ctx.lineTo(ex + 2.5, ey + 2.5)
    ctx.moveTo(ex + 2.5, ey - 2.5); ctx.lineTo(ex - 2.5, ey + 2.5)
    ctx.stroke()
  })

  // Mouth
  ctx.fillStyle = '#7F1D1D'
  ctx.fillRect(-5, -13, 10, 3)
  ctx.fillStyle = '#FCA5A5'
  ctx.fillRect(-3, -12, 2, 2)
  ctx.fillRect(1, -12, 2, 2)

  // Boss crown
  if (type === 'boss') {
    ctx.fillStyle = '#FCD34D'
    ctx.fillRect(-8, -30, 16, 6)
    ctx.fillRect(-8, -33, 4, 3)
    ctx.fillRect(-2, -35, 4, 5)
    ctx.fillRect(4, -33, 4, 3)
  }

  // HP bar
  if (maxHp > 1) {
    const bw = 30
    ctx.fillStyle = '#374151'
    ctx.fillRect(-bw / 2, -34, bw, 5)
    const hpPct = hp / maxHp
    ctx.fillStyle = hpPct > 0.5 ? '#10B981' : hpPct > 0.25 ? '#F59E0B' : '#EF4444'
    ctx.fillRect(-bw / 2, -34, bw * hpPct, 5)
  }

  ctx.restore()
}

function drawBarrel(ctx, x, y, w, h) {
  const rows = Math.ceil(h / TILE)
  const cols = Math.ceil(w / TILE)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = x + c * TILE
      const by = y + r * TILE
      // Barrel body
      const grad = ctx.createLinearGradient(bx, by, bx + TILE, by)
      grad.addColorStop(0, '#92400E')
      grad.addColorStop(0.3, '#D97706')
      grad.addColorStop(0.7, '#B45309')
      grad.addColorStop(1, '#78350F')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.rect(bx + 3, by + 3, TILE - 6, TILE - 6)
      ctx.fill()
      // Metal bands
      ctx.strokeStyle = '#6B7280'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.rect(bx + 3, by + 3, TILE - 6, TILE - 6)
      ctx.stroke()
      ctx.beginPath()
      ctx.rect(bx + 5, by + 10, TILE - 10, 3)
      ctx.rect(bx + 5, by + TILE - 13, TILE - 10, 3)
      ctx.fillStyle = '#6B7280'
      ctx.fill()
    }
  }
}

function drawVault(ctx, x, y, moneyInVault, pulse) {
  const p = Math.sin(pulse) * 3
  ctx.save()
  ctx.translate(x + TILE, y + TILE)

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 40)
  glow.addColorStop(0, '#FCD34D66')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, 40 + p, 0, Math.PI * 2)
  ctx.fill()

  // Body
  const bodyGrad = ctx.createLinearGradient(-22, -22, 22, 22)
  bodyGrad.addColorStop(0, '#9CA3AF')
  bodyGrad.addColorStop(0.5, '#6B7280')
  bodyGrad.addColorStop(1, '#374151')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.rect(-22, -22, 44, 44)
  ctx.fill()
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth = 2
  ctx.stroke()

  // Door circle
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.fillStyle = '#4B5563'
  ctx.fill()
  ctx.strokeStyle = '#9CA3AF'
  ctx.lineWidth = 2
  ctx.stroke()

  // Handle
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-6, 0); ctx.lineTo(6, 0)
  ctx.moveTo(0, -6); ctx.lineTo(0, 6)
  ctx.stroke()

  // Money counter above
  ctx.fillStyle = '#FCD34D'
  ctx.font = 'bold 11px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(`$${moneyInVault}`, 0, -30)

  ctx.restore()
}

export default function MoneyDefender({ onClose }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const mouseRef = useRef({ x: W / 2, y: H / 2 })
  const [gameState, setGameState] = useState('idle')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [moneyCollected, setMoneyCollected] = useState(0)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('moneyDefenderHS') || '0'))
  const [powerupStates, setPowerupStates] = useState(
    POWERUP_DEFS.reduce((acc, p) => ({ ...acc, [p.id]: { active: false, cooldownLeft: 0 } }), {})
  )
  const powerupIntervalRef = useRef(null)

  const initLevel = useCallback((lvl, existingScore = 0, existingMoney = 0, existingLives = 3) => {
    const map = generateMap(lvl)
    const zombieCount = 3 + lvl * 2
    const zombies = []
    const zombieTypes = ['basic', 'fast', 'tank']
    if (lvl >= 5) zombieTypes.push('boss')

    for (let i = 0; i < zombieCount; i++) {
      let zx, zy, safe
      let tries = 0
      do {
        zx = TILE * 2 + Math.random() * (W - TILE * 4)
        zy = TILE * 2 + Math.random() * (H - TILE * 4)
        const distToPlayer = Math.hypot(zx - W / 2, zy - H / 2)
        safe = distToPlayer > 150 && !map.barriers.some(b =>
          rectsOverlap(zx - 15, zy - 15, 30, 30, b.x, b.y, b.w, b.h)
        )
        tries++
      } while (!safe && tries < 50)

      const typeIndex = Math.min(Math.floor(Math.random() * (1 + lvl * 0.3)), zombieTypes.length - 1)
      const type = zombieTypes[typeIndex]
      const hpMap = { basic: 1, fast: 1, tank: 4, boss: 8 }
      const speedMap = { basic: ZOMBIE_BASE_SPEED + lvl * 0.05, fast: ZOMBIE_BASE_SPEED * 1.8 + lvl * 0.08, tank: ZOMBIE_BASE_SPEED * 0.6, boss: ZOMBIE_BASE_SPEED * 0.5 }
      const sizeMap = { basic: 15, fast: 12, tank: 18, boss: 22 }

      zombies.push({
        x: zx, y: zy,
        hp: hpMap[type], maxHp: hpMap[type],
        speed: speedMap[type],
        size: sizeMap[type],
        type,
        frameCount: Math.random() * 60,
        stunTimer: 0,
      })
    }

    gameRef.current = {
      player: {
        x: W / 2, y: H / 2,
        size: 14,
        facing: 'right',
        walking: false,
        frameCount: 0,
        invincibleTimer: 0,
      },
      zombies,
      bullets: [],
      particles: [],
      map,
      score: existingScore,
      level: lvl,
      lives: existingLives,
      moneyCollected: existingMoney,
      moneyInVault: 0,
      vaultPulse: 0,
      running: true,
      shootCooldown: 0,
      powerups: {
        speed: { active: false, timer: 0, cooldown: 0 },
        instakill: { active: false, timer: 0, cooldown: 0 },
        bomb: { active: false, timer: 0, cooldown: 0 },
        shield: { active: false, timer: 0, cooldown: 0 },
        rapidfire: { active: false, timer: 0, cooldown: 0 },
      },
      levelComplete: false,
      levelCompleteTimer: 0,
      frameCount: 0,
      floatingTexts: [],
    }
  }, [])

  const activatePowerup = useCallback((id) => {
    const g = gameRef.current
    if (!g) return
    const pw = g.powerups[id]
    const def = POWERUP_DEFS.find(p => p.id === id)
    if (!def || pw.cooldown > 0 || pw.active) return

    if (id === 'bomb') {
      // Explode all zombies on screen
      g.zombies.forEach(z => {
        g.score += 25
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2
          g.particles.push({ x: z.x, y: z.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, life: 40, color: '#F59E0B', size: 8 })
        }
      })
      g.zombies = []
      g.floatingTexts.push({ x: g.player.x, y: g.player.y - 30, text: '💣 BOOM!', life: 90, color: '#F59E0B' })
      pw.cooldown = def.cooldown / 16
      setScore(g.score)
    } else {
      pw.active = true
      pw.timer = def.duration / 16
      pw.cooldown = def.cooldown / 16
    }
    setPowerupStates(prev => ({ ...prev, [id]: { active: id !== 'bomb', cooldownLeft: def.cooldown } }))
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    const g = gameRef.current
    if (!canvas || !g || !g.running) return
    const ctx = canvas.getContext('2d')
    g.frameCount++

    // ─── INPUT ───
    const keys = keysRef.current
    const p = g.player
    const speed = g.powerups.speed?.active ? PLAYER_SPEED * 1.8 : PLAYER_SPEED
    let dx = 0, dy = 0
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= speed
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += speed
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= speed
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += speed
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707 }

    p.walking = dx !== 0 || dy !== 0
    if (dx > 0) p.facing = 'right'
    if (dx < 0) p.facing = 'left'
    if (p.walking) p.frameCount++

    // Move with collision
    const newPX = p.x + dx
    const newPY = p.y + dy
    const collides = (nx, ny) => g.map.barriers.some(b => rectsOverlap(nx - p.size, ny - p.size, p.size * 2, p.size * 2, b.x, b.y, b.w, b.h))
    if (!collides(newPX, p.y) && newPX > p.size && newPX < W - p.size) p.x = newPX
    if (!collides(p.x, newPY) && newPY > p.size && newPY < H - p.size) p.y = newPY

    // Auto-shoot toward mouse
    if (g.shootCooldown > 0) g.shootCooldown--
    const shootDelay = g.powerups.rapidfire?.active ? 5 : 15
    if (g.shootCooldown <= 0) {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const angle = Math.atan2(my - p.y, mx - p.x)
      g.bullets.push({
        x: p.x, y: p.y,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        life: 60,
        instakill: g.powerups.instakill?.active,
      })
      g.shootCooldown = shootDelay
    }

    // Powerup timers
    Object.keys(g.powerups).forEach(id => {
      const pw = g.powerups[id]
      if (pw.active && pw.timer > 0) { pw.timer--; if (pw.timer <= 0) pw.active = false }
      if (pw.cooldown > 0) pw.cooldown--
    })

    // Collect money
    g.map.money.forEach(m => {
      if (!m.collected) {
        const dist = Math.hypot(p.x - m.x, p.y - m.y)
        if (dist < 20) {
          m.collected = true
          g.moneyCollected += m.value
          g.score += m.value
          setMoneyCollected(g.moneyCollected)
          setScore(g.score)
          g.floatingTexts.push({ x: m.x, y: m.y - 20, text: `+$${m.value}`, life: 60, color: '#FCD34D' })
          for (let i = 0; i < 8; i++) {
            g.particles.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 30, color: '#FCD34D', size: 6 })
          }
        }
        m.pulse += 0.08
      }
    })

    // Deposit at vault
    const vDist = Math.hypot(p.x - (g.map.vaultX + TILE), p.y - (g.map.vaultY + TILE))
    if (vDist < 35 && g.moneyCollected > 0) {
      g.moneyInVault += g.moneyCollected
      g.score += g.moneyCollected * 2
      g.floatingTexts.push({ x: g.map.vaultX + TILE, y: g.map.vaultY - 20, text: `DEPOSITED $${g.moneyCollected}!`, life: 90, color: '#10B981' })
      g.moneyCollected = 0
      setMoneyCollected(0)
      setScore(g.score)

      // Check if all money collected
      const allCollected = g.map.money.every(m => m.collected)
      if (allCollected) {
        g.levelComplete = true
        g.levelCompleteTimer = 120
      }
    }

    // Level complete
    if (g.levelComplete) {
      g.levelCompleteTimer--
      if (g.levelCompleteTimer <= 0) {
        const nextLevel = g.level + 1
        setLevel(nextLevel)
        initLevel(nextLevel, g.score, 0, g.lives)
        return
      }
    }

    // Update zombies
    g.zombies.forEach(z => {
      z.frameCount++
      if (z.stunTimer > 0) { z.stunTimer--; return }
      const angle = Math.atan2(p.y - z.y, p.x - z.x)
      const nx = z.x + Math.cos(angle) * z.speed
      const ny = z.y + Math.sin(angle) * z.speed
      if (!g.map.barriers.some(b => rectsOverlap(nx - z.size, ny - z.size, z.size * 2, z.size * 2, b.x, b.y, b.w, b.h))) {
        z.x = nx; z.y = ny
      }

      // Hit player
      const distToPlayer = Math.hypot(z.x - p.x, z.y - p.y)
      if (distToPlayer < z.size + p.size && p.invincibleTimer <= 0) {
        if (g.powerups.shield?.active) {
          g.powerups.shield.active = false
          g.floatingTexts.push({ x: p.x, y: p.y - 40, text: '🛡️ BLOCKED!', life: 60, color: '#3B82F6' })
        } else {
          g.lives--
          setLives(g.lives)
          p.invincibleTimer = 120
          for (let i = 0; i < 12; i++) {
            g.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 40, color: '#EF4444', size: 8 })
          }
          if (g.lives <= 0) {
            g.running = false
            const finalScore = g.score
            if (finalScore > parseInt(localStorage.getItem('moneyDefenderHS') || '0')) {
              localStorage.setItem('moneyDefenderHS', finalScore.toString())
              setHighScore(finalScore)
            }
            setGameState('gameover')
          }
        }
      }
    })

    if (p.invincibleTimer > 0) p.invincibleTimer--

    // Update bullets
    g.bullets = g.bullets.filter(b => {
      b.x += b.vx; b.y += b.vy; b.life--
      if (b.life <= 0) return false
      if (g.map.barriers.some(bar => rectsOverlap(b.x - 4, b.y - 4, 8, 8, bar.x, bar.y, bar.w, bar.h))) {
        for (let i = 0; i < 4; i++) g.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 15, color: '#9CA3AF', size: 4 })
        return false
      }
      let hit = false
      g.zombies.forEach(z => {
        if (hit) return
        if (Math.hypot(b.x - z.x, b.y - z.y) < z.size + 4) {
          const dmg = b.instakill ? 999 : 1
          z.hp -= dmg
          hit = true
          for (let i = 0; i < 5; i++) g.particles.push({ x: z.x, y: z.y, vx: b.vx * 0.3 + (Math.random() - 0.5) * 3, vy: b.vy * 0.3 + (Math.random() - 0.5) * 3, life: 20, color: '#EF4444', size: 5 })
          if (z.hp <= 0) {
            g.score += { basic: 10, fast: 20, tank: 40, boss: 100 }[z.type] || 10
            setScore(g.score)
            for (let i = 0; i < 15; i++) {
              const a = (i / 15) * Math.PI * 2
              g.particles.push({ x: z.x, y: z.y, vx: Math.cos(a) * (3 + Math.random() * 4), vy: Math.sin(a) * (3 + Math.random() * 4), life: 35, color: z.type === 'boss' ? '#FCD34D' : '#EF4444', size: 8 })
            }
            // Random powerup drop from boss
            if (z.type === 'boss' && Math.random() > 0.3) {
              const randPw = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)]
              g.floatingTexts.push({ x: z.x, y: z.y - 30, text: `${randPw.icon} ${randPw.name} ready!`, life: 90, color: randPw.color })
              const pw = g.powerups[randPw.id]
              pw.cooldown = 0
            }
          }
        }
      })
      g.zombies = g.zombies.filter(z => z.hp > 0)
      return !hit
    })

    // ─── DRAW ───
    // Background grid
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 1
    for (let gx = 0; gx < W; gx += TILE) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke() }
    for (let gy = 0; gy < H; gy += TILE) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke() }

    // Barriers (barrels)
    g.map.barriers.forEach(b => drawBarrel(ctx, b.x, b.y, b.w, b.h))

    // Money bags
    g.map.money.forEach(m => {
      if (m.collected) return
      const scale = 1 + Math.sin(m.pulse) * 0.1
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.scale(scale, scale)
      // Glow
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#FCD34D22'
      ctx.fill()
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('💰', 0, 7)
      ctx.font = 'bold 9px Arial'
      ctx.fillStyle = '#FCD34D'
      ctx.fillText(`$${m.value}`, 0, 22)
      ctx.restore()
    })

    // Vault
    g.map.vaultPulse += 0.05
    drawVault(ctx, g.map.vaultX, g.map.vaultY, g.moneyInVault, g.map.vaultPulse)

    // Vault range indicator
    ctx.beginPath()
    ctx.arc(g.map.vaultX + TILE, g.map.vaultY + TILE, 35, 0, Math.PI * 2)
    ctx.strokeStyle = '#FCD34D33'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // Zombies
    g.zombies.forEach(z => drawZombie(ctx, z.x, z.y, z.hp, z.maxHp, z.frameCount, z.type))

    // Player (flicker if invincible)
    if (p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer / 8) % 2 === 0) {
      drawPixelChar(ctx, p.x, p.y, p.facing, p.walking, p.frameCount, g.powerups.shield?.active)
    }

    // Bullets
    g.bullets.forEach(b => {
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fillStyle = b.instakill ? '#FCD34D' : '#60A5FA'
      ctx.fill()
      if (b.instakill) {
        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.strokeStyle = '#FCD34D88'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
    })

    // Particles
    g.particles = g.particles.filter(pt => {
      pt.x += pt.vx; pt.y += pt.vy; pt.life--
      pt.vx *= 0.93; pt.vy *= 0.93
      ctx.globalAlpha = pt.life / 40
      ctx.fillStyle = pt.color
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pt.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      return pt.life > 0
    })

    // Floating texts
    g.floatingTexts = g.floatingTexts.filter(ft => {
      ft.y -= 0.5
      ft.life--
      ctx.globalAlpha = Math.min(1, ft.life / 30)
      ctx.fillStyle = ft.color
      ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.globalAlpha = 1
      return ft.life > 0
    })

    // HUD
    ctx.fillStyle = '#00000099'
    ctx.fillRect(0, 0, W, 44)

    // Lives
    ctx.font = '18px Arial'
    ctx.textAlign = 'left'
    for (let i = 0; i < Math.max(0, g.lives); i++) ctx.fillText('❤️', 8 + i * 26, 28)

    // Score / money
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Score: ${g.score}`, W / 2, 18)
    ctx.fillStyle = '#FCD34D'
    ctx.font = '12px Arial'
    ctx.fillText(`💰 Carrying: $${g.moneyCollected}  |  🏦 Vault: $${g.moneyInVault}`, W / 2, 35)

    // Level + highscore
    ctx.textAlign = 'right'
    ctx.fillStyle = '#A5B4FC'
    ctx.font = '13px Arial'
    ctx.fillText(`Level ${g.level}`, W - 8, 18)
    ctx.fillStyle = '#FCD34D'
    ctx.font = '11px Arial'
    ctx.fillText(`Best: ${highScore}`, W - 8, 33)

    // Level complete overlay
    if (g.levelComplete) {
      ctx.fillStyle = '#00000088'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#FCD34D'
      ctx.font = 'bold 36px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('✅ Level Complete!', W / 2, H / 2 - 20)
      ctx.fillStyle = '#A5B4FC'
      ctx.font = '18px Arial'
      ctx.fillText(`Preparing Level ${g.level + 1}...`, W / 2, H / 2 + 20)
    }

    // Minimap
    const mm = { x: W - 100, y: H - 70, w: 90, h: 60 }
    ctx.fillStyle = '#00000088'
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h)
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    ctx.strokeRect(mm.x, mm.y, mm.w, mm.h)
    // Vault on minimap
    const vMapX = mm.x + (g.map.vaultX / W) * mm.w
    const vMapY = mm.y + (g.map.vaultY / H) * mm.h
    ctx.fillStyle = '#FCD34D'
    ctx.fillRect(vMapX - 3, vMapY - 3, 6, 6)
    // Money on minimap
    g.map.money.filter(m => !m.collected).forEach(m => {
      ctx.fillStyle = '#10B981'
      ctx.fillRect(mm.x + (m.x / W) * mm.w - 1.5, mm.y + (m.y / H) * mm.h - 1.5, 3, 3)
    })
    // Player on minimap
    ctx.fillStyle = '#60A5FA'
    ctx.beginPath()
    ctx.arc(mm.x + (p.x / W) * mm.w, mm.y + (p.y / H) * mm.h, 3, 0, Math.PI * 2)
    ctx.fill()
    // Zombies on minimap
    g.zombies.forEach(z => {
      ctx.fillStyle = '#EF4444'
      ctx.fillRect(mm.x + (z.x / W) * mm.w - 1.5, mm.y + (z.y / H) * mm.h - 1.5, 3, 3)
    })

    if (g.running && !g.levelComplete) {
      animRef.current = requestAnimationFrame(gameLoop)
    } else if (g.levelComplete) {
      animRef.current = requestAnimationFrame(gameLoop)
    }
  }, [highScore, initLevel])

  const startGame = useCallback(() => {
    initLevel(1)
    setScore(0)
    setLevel(1)
    setLives(3)
    setMoneyCollected(0)
    setPowerupStates(POWERUP_DEFS.reduce((acc, p) => ({ ...acc, [p.id]: { active: false, cooldownLeft: 0 } }), {}))
    setGameState('playing')
  }, [initLevel])

  useEffect(() => {
    if (gameState === 'playing') {
      animRef.current = requestAnimationFrame(gameLoop)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [gameState, gameLoop])

  // Powerup cooldown UI ticker
  useEffect(() => {
    if (gameState !== 'playing') return
    powerupIntervalRef.current = setInterval(() => {
      const g = gameRef.current
      if (!g) return
      setPowerupStates(
        POWERUP_DEFS.reduce((acc, p) => ({
          ...acc,
          [p.id]: {
            active: g.powerups[p.id]?.active || false,
            cooldownLeft: Math.round((g.powerups[p.id]?.cooldown || 0) * 16 / 1000),
          }
        }), {})
      )
    }, 200)
    return () => clearInterval(powerupIntervalRef.current)
  }, [gameState])

  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; e.preventDefault() }
    const up = (e) => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-2">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">💼 Money Defender</h2>
            <p className="text-gray-400 text-xs">Collect money • Reach the vault • Survive!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-yellow-400 font-bold text-sm">${score}</p>
              <p className="text-gray-500 text-xs">Score</p>
            </div>
            <div className="text-center">
              <p className="text-indigo-400 font-bold text-sm">Level {level}</p>
              <p className="text-gray-500 text-xs">Current</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition ml-2">✕</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full"
            onMouseMove={handleMouseMove}
          />

          {/* Idle */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
              <p className="text-5xl mb-3">💼</p>
              <h3 className="text-white text-2xl font-bold mb-2">Money Defender</h3>
              <p className="text-gray-400 text-sm mb-4 text-center px-8">Collect money bags 💰 • Deposit at the vault 🏦 • Defeat zombies 🧟</p>
              <div className="grid grid-cols-2 gap-2 mb-5 text-xs text-gray-400 text-center">
                <div className="bg-gray-800 rounded-lg px-3 py-2">⌨️ WASD / Arrows to move</div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">🖱️ Mouse aims & shoots</div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">💰 Collect all money bags</div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">🏦 Deposit at vault to advance</div>
              </div>
              {highScore > 0 && <p className="text-yellow-400 text-sm mb-4">🏆 Best: ${highScore}</p>}
              <button onClick={startGame} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition text-lg">
                🎮 Start Game
              </button>
            </div>
          )}

          {/* Game Over */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
              <p className="text-5xl mb-3">💀</p>
              <h3 className="text-red-400 text-2xl font-bold mb-2">Game Over!</h3>
              <p className="text-gray-300 text-lg mb-1">Score: <span className="text-white font-bold text-2xl">${score}</span></p>
              <p className="text-gray-400 text-sm mb-2">Level reached: <span className="text-indigo-400 font-bold">{level}</span></p>
              {score > 0 && score >= highScore && <p className="text-yellow-400 font-bold text-sm mb-2">🏆 New High Score!</p>}
              <p className="text-gray-500 text-xs mb-6">Best: ${highScore}</p>
              <div className="flex gap-3">
                <button onClick={startGame} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">🔄 Play Again</button>
                <button onClick={onClose} className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 transition">Exit</button>
              </div>
            </div>
          )}
        </div>

        {/* Powerups bar */}
        {gameState === 'playing' && (
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex gap-2 justify-center flex-wrap flex-shrink-0">
            {POWERUP_DEFS.map((def) => {
              const state = powerupStates[def.id]
              const onCooldown = state?.cooldownLeft > 0
              const isActive = state?.active
              return (
                <button
                  key={def.id}
                  onClick={() => activatePowerup(def.id)}
                  disabled={onCooldown}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                    isActive ? 'border-green-400 bg-green-900/30 text-green-300' :
                    onCooldown ? 'border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed' :
                    'border-gray-600 bg-gray-700 text-white hover:border-indigo-400 hover:bg-indigo-900/30'
                  }`}
                  style={{ minWidth: 70 }}
                >
                  <span className="text-xl mb-0.5">{def.icon}</span>
                  <span className="text-center leading-tight">{def.name}</span>
                  {isActive && <span className="text-green-400 text-xs mt-0.5">ACTIVE</span>}
                  {onCooldown && <span className="text-gray-400 text-xs mt-0.5">{state.cooldownLeft}s</span>}
                  {!isActive && !onCooldown && <span className="text-indigo-400 text-xs mt-0.5">READY</span>}
                </button>
              )
            })}
            <div className="flex items-center px-3 py-2 bg-gray-700 rounded-xl text-xs text-gray-400 border border-gray-600">
              <span>🗺️ Minimap: bottom-right</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}