import { useEffect, useRef, useState, useCallback } from 'react'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400

const ZOMBIE_TYPES = [
  { name: 'Impulse Buyer', color: '#EF4444', hp: 1, speed: 1.2, size: 35, points: 10 },
  { name: 'Subscription', color: '#8B5CF6', hp: 2, speed: 0.9, size: 40, points: 20 },
  { name: 'Overspender', color: '#F97316', hp: 3, speed: 0.7, size: 45, points: 30 },
  { name: 'Debt Monster', color: '#DC2626', hp: 5, speed: 0.5, size: 55, points: 50 },
]

const POWERUP_TYPES = [
  { name: 'Budget Shield', icon: '🛡️', color: '#3B82F6', effect: 'shield' },
  { name: 'Savings Bomb', icon: '💣', color: '#F59E0B', effect: 'bomb' },
  { name: 'Income Boost', icon: '💰', color: '#10B981', effect: 'rapidfire' },
  { name: 'Debt Freeze', icon: '❄️', color: '#06B6D4', effect: 'freeze' },
]

export default function ZombieGame({ onClose }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animRef = useRef(null)
  const [gameState, setGameState] = useState('idle') // idle, playing, gameover
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('zombieHighScore') || '0'))
  const [activePowerup, setActivePowerup] = useState(null)
  const [lives, setLives] = useState(3)

  const initGame = useCallback(() => {
    gameRef.current = {
      zombies: [],
      bullets: [],
      powerups: [],
      particles: [],
      score: 0,
      wave: 1,
      lives: 3,
      waveTimer: 0,
      waveDelay: 180,
      zombiesThisWave: 0,
      maxZombiesThisWave: 5,
      zombieSpawnTimer: 0,
      zombieSpawnDelay: 90,
      shield: false,
      rapidFire: false,
      freeze: false,
      powerupTimer: 0,
      rapidFireTimer: 0,
      freezeTimer: 0,
      shieldTimer: 0,
      powerupSpawnTimer: 0,
      lastShotTime: 0,
      mouseX: CANVAS_WIDTH / 2,
      mouseY: CANVAS_HEIGHT / 2,
      running: true,
    }
  }, [])

  const spawnZombie = (wave) => {
    const g = gameRef.current
    const typeIndex = Math.min(Math.floor(Math.random() * Math.min(wave, ZOMBIE_TYPES.length)), ZOMBIE_TYPES.length - 1)
    const type = ZOMBIE_TYPES[typeIndex]
    const speedMultiplier = 1 + (wave - 1) * 0.15
    g.zombies.push({
      x: CANVAS_WIDTH + type.size,
      y: 80 + Math.random() * (CANVAS_HEIGHT - 180),
      hp: type.hp + Math.floor(wave / 3),
      maxHp: type.hp + Math.floor(wave / 3),
      speed: type.speed * speedMultiplier,
      size: type.size,
      color: type.color,
      name: type.name,
      points: type.points,
      frozen: false,
      frozenTimer: 0,
      wobble: Math.random() * Math.PI * 2,
    })
  }

  const spawnPowerup = () => {
    const g = gameRef.current
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    g.powerups.push({
      x: 200 + Math.random() * (CANVAS_WIDTH - 400),
      y: 80 + Math.random() * (CANVAS_HEIGHT - 160),
      type,
      life: 300,
      pulse: 0,
    })
  }

  const shoot = useCallback((targetX, targetY) => {
    const g = gameRef.current
    if (!g || !g.running) return
    const now = Date.now()
    const shootDelay = g.rapidFire ? 80 : 250
    if (now - g.lastShotTime < shootDelay) return
    g.lastShotTime = now

    const playerX = 80
    const playerY = CANVAS_HEIGHT / 2
    const angle = Math.atan2(targetY - playerY, targetX - playerX)
    const speed = 12

    g.bullets.push({
      x: playerX + 30,
      y: playerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: g.rapidFire ? 8 : 10,
      color: g.rapidFire ? '#F59E0B' : '#4F46E5',
    })

    // Particle burst at player
    for (let i = 0; i < 3; i++) {
      g.particles.push({
        x: playerX + 30,
        y: playerY,
        vx: Math.cos(angle + (Math.random() - 0.5)) * (3 + Math.random() * 3),
        vy: Math.sin(angle + (Math.random() - 0.5)) * (3 + Math.random() * 3),
        life: 20,
        color: '#A5B4FC',
        size: 4,
      })
    }
  }, [])

  const activateBomb = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    // Explosion particles
    g.zombies.forEach(z => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        g.particles.push({
          x: z.x, y: z.y,
          vx: Math.cos(angle) * (4 + Math.random() * 4),
          vy: Math.sin(angle) * (4 + Math.random() * 4),
          life: 40, color: '#F59E0B', size: 8,
        })
      }
      g.score += z.points
    })
    g.zombies = []
    setScore(g.score)
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!g || !g.running) return

    // Clear
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw ground
    ctx.fillStyle = '#1E293B'
    ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60)
    ctx.fillStyle = '#334155'
    ctx.fillRect(0, CANVAS_HEIGHT - 62, CANVAS_WIDTH, 4)

    // Draw city skyline background
    ctx.fillStyle = '#1E293B'
    const buildings = [
      [650, 80, 60, 200], [720, 100, 50, 180], [580, 90, 55, 190],
      [750, 60, 40, 220], [510, 110, 65, 170],
    ]
    buildings.forEach(([x, y, w, h]) => {
      ctx.fillRect(x, y, w, h)
      // windows
      ctx.fillStyle = Math.random() > 0.7 ? '#FCD34D' : '#374151'
      for (let wx = x + 8; wx < x + w - 8; wx += 15) {
        for (let wy = y + 10; wy < y + h - 10; wy += 20) {
          ctx.fillRect(wx, wy, 8, 10)
        }
      }
      ctx.fillStyle = '#1E293B'
    })

    // Wave transition
    g.waveTimer++
    if (g.zombiesThisWave >= g.maxZombiesThisWave && g.zombies.length === 0) {
      if (g.waveTimer >= g.waveDelay) {
        g.wave++
        g.waveTimer = 0
        g.zombiesThisWave = 0
        g.maxZombiesThisWave = 5 + g.wave * 2
        g.zombieSpawnDelay = Math.max(30, 90 - g.wave * 5)
        setWave(g.wave)
        // Show wave text
        g.showWaveText = 120
      } else if (g.waveTimer < 120) {
        ctx.fillStyle = '#4F46E5'
        ctx.font = 'bold 28px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`Wave ${g.wave} Complete! 🎉`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)
        ctx.font = '18px Arial'
        ctx.fillStyle = '#A5B4FC'
        ctx.fillText(`Next wave in ${Math.ceil((g.waveDelay - g.waveTimer) / 60)}s`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
      }
    }

    // Spawn zombies
    if (g.zombiesThisWave < g.maxZombiesThisWave) {
      g.zombieSpawnTimer++
      if (g.zombieSpawnTimer >= g.zombieSpawnDelay) {
        spawnZombie(g.wave)
        g.zombiesThisWave++
        g.zombieSpawnTimer = 0
      }
    }

    // Spawn powerups
    g.powerupSpawnTimer++
    if (g.powerupSpawnTimer >= 600 + Math.random() * 300) {
      spawnPowerup()
      g.powerupSpawnTimer = 0
    }

    // Update & draw powerups
    g.powerups = g.powerups.filter(p => p.life > 0)
    g.powerups.forEach(p => {
      p.life--
      p.pulse += 0.1
      const scale = 1 + Math.sin(p.pulse) * 0.1

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(scale, scale)
      ctx.beginPath()
      ctx.arc(0, 0, 22, 0, Math.PI * 2)
      ctx.fillStyle = p.type.color + '33'
      ctx.fill()
      ctx.strokeStyle = p.type.color
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(p.type.icon, 0, 7)
      ctx.restore()

      ctx.font = 'bold 9px Arial'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText(p.type.name, p.x, p.y + 35)
    })

    // Update timers
    if (g.rapidFire) { g.rapidFireTimer--; if (g.rapidFireTimer <= 0) { g.rapidFire = false; setActivePowerup(null) } }
    if (g.freeze) { g.freezeTimer--; if (g.freezeTimer <= 0) { g.freeze = false; g.zombies.forEach(z => z.frozen = false) } }
    if (g.shield) { g.shieldTimer--; if (g.shieldTimer <= 0) { g.shield = false } }

    // Update & draw zombies
    g.zombies = g.zombies.filter(z => {
      z.wobble += 0.1
      if (!z.frozen && !g.freeze) z.x -= z.speed
      if (z.frozen || g.freeze) {
        // ice overlay
        ctx.fillStyle = '#BAE6FD55'
        ctx.beginPath()
        ctx.arc(z.x, z.y, z.size + 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Zombie body
      const bobY = Math.sin(z.wobble) * 3
      ctx.fillStyle = z.color
      ctx.beginPath()
      ctx.arc(z.x, z.y + bobY, z.size * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Zombie face
      ctx.fillStyle = '#FCA5A5'
      ctx.beginPath()
      ctx.arc(z.x, z.y + bobY - z.size * 0.1, z.size * 0.35, 0, Math.PI * 2)
      ctx.fill()

      // Eyes
      ctx.fillStyle = '#7F1D1D'
      ctx.beginPath()
      ctx.arc(z.x - 6, z.y + bobY - z.size * 0.1 - 4, 4, 0, Math.PI * 2)
      ctx.arc(z.x + 6, z.y + bobY - z.size * 0.1 - 4, 4, 0, Math.PI * 2)
      ctx.fill()

      // X eyes
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 1.5
      ;[-6, 6].forEach(ex => {
        ctx.beginPath()
        ctx.moveTo(z.x + ex - 3, z.y + bobY - z.size * 0.1 - 7)
        ctx.lineTo(z.x + ex + 3, z.y + bobY - z.size * 0.1 - 1)
        ctx.moveTo(z.x + ex + 3, z.y + bobY - z.size * 0.1 - 7)
        ctx.lineTo(z.x + ex - 3, z.y + bobY - z.size * 0.1 - 1)
        ctx.stroke()
      })

      // Arms
      ctx.strokeStyle = z.color
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(z.x - z.size * 0.4, z.y + bobY + z.size * 0.1)
      ctx.lineTo(z.x - z.size * 0.7, z.y + bobY - z.size * 0.2)
      ctx.moveTo(z.x + z.size * 0.4, z.y + bobY + z.size * 0.1)
      ctx.lineTo(z.x + z.size * 0.7, z.y + bobY - z.size * 0.2)
      ctx.stroke()

      // HP bar
      const barW = z.size * 1.2
      ctx.fillStyle = '#374151'
      ctx.fillRect(z.x - barW / 2, z.y + bobY - z.size - 15, barW, 6)
      ctx.fillStyle = z.hp / z.maxHp > 0.5 ? '#10B981' : z.hp / z.maxHp > 0.25 ? '#F59E0B' : '#EF4444'
      ctx.fillRect(z.x - barW / 2, z.y + bobY - z.size - 15, barW * (z.hp / z.maxHp), 6)

      // Name
      ctx.fillStyle = '#E2E8F0'
      ctx.font = '9px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(z.name, z.x, z.y + bobY + z.size + 12)

      // Reached player
      if (z.x < 100) {
        if (!g.shield) {
          g.lives--
          setLives(g.lives)
          // Shake effect
          g.shakeTimer = 20
        } else {
          g.shield = false
          setActivePowerup(null)
        }
        if (g.lives <= 0) {
          g.running = false
          const finalScore = g.score
          if (finalScore > parseInt(localStorage.getItem('zombieHighScore') || '0')) {
            localStorage.setItem('zombieHighScore', finalScore.toString())
            setHighScore(finalScore)
          }
          setGameState('gameover')
          return false
        }
        return false
      }
      return true
    })

    // Update & draw bullets
    g.bullets = g.bullets.filter(b => {
      b.x += b.vx
      b.y += b.vy
      if (b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) return false

      // Coin bullet
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FDE68A'
      ctx.font = `${b.size}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText('🪙', b.x, b.y + b.size / 3)

      // Hit detection
      let hit = false
      g.zombies.forEach(z => {
        const dist = Math.hypot(b.x - z.x, b.y - z.y)
        if (dist < z.size * 0.6) {
          z.hp--
          hit = true
          // Hit particles
          for (let i = 0; i < 5; i++) {
            g.particles.push({
              x: z.x, y: z.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 20, color: z.color, size: 6,
            })
          }
          if (z.hp <= 0) {
            g.score += z.points * g.wave
            setScore(g.score)
            // Death particles
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2
              g.particles.push({
                x: z.x, y: z.y,
                vx: Math.cos(angle) * (3 + Math.random() * 4),
                vy: Math.sin(angle) * (3 + Math.random() * 4),
                life: 35, color: z.color, size: 8,
              })
            }
          }
        }
      })
      g.zombies = g.zombies.filter(z => z.hp > 0)
      return !hit
    })

    // Bullet-powerup collision
    g.bullets.forEach(b => {
      g.powerups = g.powerups.filter(p => {
        const dist = Math.hypot(b.x - p.x, b.y - p.y)
        if (dist < 25) {
          // Activate powerup
          if (p.type.effect === 'bomb') { activateBomb() }
          else if (p.type.effect === 'rapidfire') { g.rapidFire = true; g.rapidFireTimer = 300; setActivePowerup('⚡ Rapid Fire!') }
          else if (p.type.effect === 'freeze') { g.freeze = true; g.freezeTimer = 300; g.zombies.forEach(z => z.frozen = true); setActivePowerup('❄️ Freeze!') }
          else if (p.type.effect === 'shield') { g.shield = true; g.shieldTimer = 600; setActivePowerup('🛡️ Shield Active!') }
          return false
        }
        return true
      })
    })

    // Update & draw particles
    g.particles = g.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life--
      p.vx *= 0.95
      p.vy *= 0.95
      ctx.globalAlpha = p.life / 35
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      return p.life > 0
    })

    // Draw player (wallet)
    const playerX = 80
    const playerY = CANVAS_HEIGHT / 2
    const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.05

    if (g.shield) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(playerX, playerY, 45 * pulseScale, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.font = `${50 * pulseScale}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('👛', playerX, playerY + 18)

    // Aim line
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 10])
    ctx.beginPath()
    ctx.moveTo(playerX + 30, playerY)
    ctx.lineTo(g.mouseX, g.mouseY)
    ctx.stroke()
    ctx.setLineDash([])

    // HUD
    ctx.fillStyle = '#0F172A99'
    ctx.fillRect(0, 0, CANVAS_WIDTH, 50)

    // Lives
    ctx.font = '22px Arial'
    ctx.textAlign = 'left'
    for (let i = 0; i < g.lives; i++) {
      ctx.fillText('❤️', 10 + i * 30, 32)
    }

    // Score
    ctx.fillStyle = 'white'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Score: ${g.score}`, CANVAS_WIDTH / 2, 30)

    // Wave
    ctx.textAlign = 'right'
    ctx.fillStyle = '#A5B4FC'
    ctx.fillText(`Wave ${g.wave}`, CANVAS_WIDTH - 10, 20)
    ctx.fillStyle = '#FCD34D'
    ctx.font = '13px Arial'
    ctx.fillText(`Best: ${highScore}`, CANVAS_WIDTH - 10, 40)

    // Active powerup indicator
    if (activePowerup) {
      ctx.fillStyle = '#FCD34D'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(activePowerup, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15)
    }

    if (g.running) {
      animRef.current = requestAnimationFrame(gameLoop)
    }
  }, [activeBomb, activePowerup, highScore])

  const startGame = useCallback(() => {
    initGame()
    setScore(0)
    setWave(1)
    setLives(3)
    setActivePowerup(null)
    setGameState('playing')
  }, [initGame])

  useEffect(() => {
    if (gameState === 'playing') {
      animRef.current = requestAnimationFrame(gameLoop)
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [gameState, gameLoop])

  const handleCanvasClick = useCallback((e) => {
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    shoot(x, y)
  }, [gameState, shoot])

  const handleMouseMove = useCallback((e) => {
    if (gameState !== 'playing' || !gameRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    gameRef.current.mouseX = (e.clientX - rect.left) * scaleX
    gameRef.current.mouseY = (e.clientY - rect.top) * scaleY
  }, [gameState])

  const handleTouch = useCallback((e) => {
    e.preventDefault()
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const touch = e.touches[0]
    const x = (touch.clientX - rect.left) * scaleX
    const y = (touch.clientY - rect.top) * scaleY
    shoot(x, y)
  }, [gameState, shoot])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-xl">🧟 Money Defender</h2>
            <p className="text-gray-400 text-xs">Defend your wallet from spending zombies!</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl transition">✕</button>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full cursor-crosshair"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouch}
          />

          {/* Idle screen */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
              <p className="text-6xl mb-4">🧟</p>
              <h3 className="text-white text-2xl font-bold mb-2">Money Defender</h3>
              <p className="text-gray-400 text-sm mb-2 text-center px-8">Spending zombies are attacking your wallet!</p>
              <p className="text-gray-500 text-xs mb-6 text-center px-8">Click to shoot 🪙 coins • Shoot powerups to activate them</p>
              <div className="flex gap-4 mb-6 flex-wrap justify-center">
                {POWERUP_TYPES.map(p => (
                  <div key={p.name} className="flex items-center gap-1 text-xs text-gray-300">
                    <span>{p.icon}</span><span>{p.name}</span>
                  </div>
                ))}
              </div>
              {highScore > 0 && <p className="text-yellow-400 text-sm mb-4">🏆 Best Score: {highScore}</p>}
              <button onClick={startGame}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition text-lg">
                🎮 Start Game
              </button>
            </div>
          )}

          {/* Game over screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
              <p className="text-5xl mb-3">💀</p>
              <h3 className="text-red-400 text-2xl font-bold mb-1">Game Over!</h3>
              <p className="text-gray-300 text-lg mb-1">Score: <span className="text-white font-bold">{score}</span></p>
              <p className="text-gray-400 text-sm mb-1">Wave reached: <span className="text-indigo-400 font-bold">{wave}</span></p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 font-bold text-sm mb-3">🏆 New High Score!</p>
              )}
              <p className="text-gray-500 text-xs mb-6">Best: {highScore}</p>
              <div className="flex gap-3">
                <button onClick={startGame}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
                  🔄 Play Again
                </button>
                <button onClick={onClose}
                  className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 transition">
                  Exit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {gameState === 'playing' && (
          <div className="px-6 py-3 bg-gray-800 flex justify-between items-center text-xs text-gray-400">
            <span>🖱️ Click to shoot coins</span>
            <span>🎯 Shoot powerup orbs to activate</span>
            <span>🛡️ Shield blocks one zombie hit</span>
          </div>
        )}
      </div>
    </div>
  )
}