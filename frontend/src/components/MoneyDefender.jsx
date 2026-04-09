import { useState, useEffect, useRef, useCallback } from 'react'

const getHS = k => parseInt(localStorage.getItem('mg5_' + k) || '0')
const saveHS = (k, v) => { if (v > getHS(k)) localStorage.setItem('mg5_' + k, String(v)) }

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function Shell({ title, emoji, onClose, score, hs, lives, extra, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', fontFamily:'system-ui' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', background:'rgba(0,0,0,0.88)', borderBottom:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:22 }}>{emoji}</span>
          <span style={{ fontSize:15, fontWeight:700, color:'white' }}>{title}</span>
        </div>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          {lives !== undefined && <span style={{ fontSize:18 }}>{'❤️'.repeat(Math.max(0,lives))}</span>}
          {score !== undefined && <span style={{ fontSize:14, fontWeight:700, color:'#FCD34D' }}>Score: {score}</span>}
          {hs !== undefined && <span style={{ fontSize:11, color:'#64748B' }}>Best: {hs}</span>}
          {extra}
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'white', padding:'5px 14px', borderRadius:8, cursor:'pointer', fontSize:13 }}>✕ Exit</button>
        </div>
      </div>
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>{children}</div>
    </div>
  )
}

function Over({ score, hs, onRestart, onExit, msg }) {
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:30 }}>
      <div style={{ background:'#1E293B', borderRadius:20, padding:'28px 36px', textAlign:'center', border:'2px solid #334155', minWidth:240 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>💀</div>
        <div style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:6 }}>Game Over!</div>
        {msg && <div style={{ fontSize:12, color:'#94A3B8', marginBottom:10 }}>{msg}</div>}
        <div style={{ fontSize:30, fontWeight:700, color:'#FCD34D', marginBottom:4 }}>{score}</div>
        {score > 0 && score >= hs && <div style={{ fontSize:11, color:'#10B981', marginBottom:6 }}>🏆 New High Score!</div>}
        <div style={{ fontSize:11, color:'#475569', marginBottom:20 }}>Best: {hs}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onRestart} style={{ padding:'9px 22px', background:'#7C3AED', color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700 }}>Play Again</button>
          <button onClick={onExit} style={{ padding:'9px 22px', background:'#334155', color:'white', border:'none', borderRadius:10, cursor:'pointer' }}>Exit</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 1 — MONEY RAIN (unchanged — good)
// ═══════════════════════════════════════════════════════════
function MoneyRain({ onClose }) {
  const cvRef = useRef(null), stRef = useRef(null), rafRef = useRef(null)
  const [ui, setUi] = useState({ score:0, lives:3, over:false })
  const [hs, setHs] = useState(getHS('rain'))
  const ITEMS = [
    { good:true,  e:'💰', v:100, sz:52 }, { good:true,  e:'💵', v:50,  sz:48 },
    { good:true,  e:'🪙', v:20,  sz:38 }, { good:true,  e:'🎁', v:200, sz:50 },
    { good:false, e:'💸', lbl:'TAX',      sz:50 }, { good:false, e:'🧾', lbl:'BILL',     sz:46 },
    { good:false, e:'💳', lbl:'DEBT',     sz:46 }, { good:false, e:'🏥', lbl:'HOSPITAL', sz:50 },
  ]
  const start = useCallback(() => {
    const cv = cvRef.current; if (!cv) return
    const W=cv.width, H=cv.height, ctx=cv.getContext('2d')
    stRef.current = { bx:W/2-65, bw:130, items:[], score:0, lives:3, frame:0, combo:0, ct:0, hue:200, keys:{} }
    setUi({ score:0, lives:3, over:false })
    const kd=e=>{stRef.current.keys[e.key]=true}
    const ku=e=>{stRef.current.keys[e.key]=false}
    const mm=e=>{const r=cv.getBoundingClientRect();stRef.current.bx=Math.max(0,Math.min(W-stRef.current.bw,(e.clientX-r.left)*(W/r.width)-stRef.current.bw/2))}
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku); cv.addEventListener('mousemove',mm)
    const loop=()=>{
      const s=stRef.current; if(!s||s.over) return
      s.frame++; s.hue=(s.hue+0.07)%360
      const spd=1.6+s.frame/500
      if(s.keys['ArrowLeft']||s.keys['a']) s.bx=Math.max(0,s.bx-9)
      if(s.keys['ArrowRight']||s.keys['d']) s.bx=Math.min(W-s.bw,s.bx+9)
      const rate=Math.max(35,85-Math.floor(s.frame/200)*5)
      if(s.frame%rate===0){const t=ITEMS[Math.floor(Math.random()*ITEMS.length)];s.items.push({...t,x:t.sz/2+Math.random()*(W-t.sz),y:-t.sz,vy:spd+Math.random()*0.9})}
      if(s.ct>0)s.ct--;else s.combo=0
      const BY=H-95,BH=48
      s.items=s.items.filter(it=>{
        it.y+=it.vy
        const caught=it.y+it.sz/2>=BY&&it.y<BY+BH&&it.x>s.bx-8&&it.x<s.bx+s.bw+8
        if(caught){
          if(it.good){s.combo++;s.ct=90;s.score+=it.v*(s.combo>=3?2:1)}
          else{s.combo=0;s.lives=Math.max(0,s.lives-1);if(!s.lives){s.over=true;saveHS('rain',s.score);setHs(getHS('rain'));setUi({score:s.score,lives:0,over:true})}}
          setUi(u=>({...u,score:s.score,lives:s.lives}));return false
        }
        if(it.y>H+10){if(it.good)s.combo=0;return false}
        return true
      })
      const g=ctx.createLinearGradient(0,0,0,H)
      g.addColorStop(0,`hsl(${s.hue},65%,22%)`);g.addColorStop(0.7,`hsl(${(s.hue+50)%360},55%,15%)`);g.addColorStop(1,`hsl(${(s.hue+100)%360},45%,10%)`)
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
      ctx.fillStyle='rgba(255,255,255,0.07)'
      for(let i=0;i<3;i++){const cx=((s.frame*0.4+i*200)%(W+120))-60;ctx.beginPath();ctx.ellipse(cx,55+i*45,65,24,0,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle=`hsl(${s.hue},35%,13%)`;ctx.fillRect(0,H-105,W,105)
      ctx.fillStyle=`hsl(${s.hue},45%,20%)`;ctx.fillRect(0,H-105,W,5)
      s.items.forEach(it=>{
        ctx.save();ctx.font=`${it.sz}px serif`;ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.shadowColor=it.good?'#FCD34D':'#EF4444';ctx.shadowBlur=20
        ctx.fillText(it.e,it.x,it.y);ctx.shadowBlur=0
        ctx.font='bold 12px system-ui';ctx.fillStyle=it.good?'#FCD34D':'#FCA5A5';ctx.textBaseline='alphabetic'
        ctx.fillText(it.good?`+$${it.v}`:it.lbl,it.x,it.y+it.sz/2+14);ctx.restore()
      })
      const bx=s.bx,bw=s.bw
      ctx.fillStyle='#2563EB';rr(ctx,bx,BY,bw,BH-12,8);ctx.fill()
      ctx.fillStyle='#3B82F6';rr(ctx,bx+4,BY+4,bw-8,BH-22,5);ctx.fill()
      ctx.strokeStyle='#1D4ED8';ctx.lineWidth=1.5
      for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(bx+(bw/4)*i,BY+3);ctx.lineTo(bx+(bw/4)*i,BY+BH-14);ctx.stroke()}
      ctx.beginPath();ctx.moveTo(bx+3,BY+(BH-14)/2);ctx.lineTo(bx+bw-3,BY+(BH-14)/2);ctx.stroke()
      ctx.strokeStyle='#93C5FD';ctx.lineWidth=4;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(bx+bw*0.18,BY+1);ctx.lineTo(bx+bw*0.82,BY+1);ctx.stroke()
      ctx.fillStyle='#1D4ED8'
      ctx.beginPath();ctx.arc(bx+bw*0.25,BY+BH-3,8,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(bx+bw*0.75,BY+BH-3,8,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#93C5FD'
      ctx.beginPath();ctx.arc(bx+bw*0.25,BY+BH-3,3,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(bx+bw*0.75,BY+BH-3,3,0,Math.PI*2);ctx.fill()
      if(s.combo>=2){ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillStyle='#FCD34D';ctx.shadowColor='#FCD34D';ctx.shadowBlur=10;ctx.fillText(`🔥 x${s.combo} COMBO! 2×`,W/2,55);ctx.shadowBlur=0}
      rafRef.current=requestAnimationFrame(loop)
    }
    loop()
    return()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);cv.removeEventListener('mousemove',mm);cancelAnimationFrame(rafRef.current)}
  },[])
  useEffect(()=>{const c=start();return()=>{c?.();cancelAnimationFrame(rafRef.current)}},[start])
  return(
    <Shell title="Money Rain" emoji="💰" onClose={onClose} score={ui.score} hs={hs} lives={ui.lives}>
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F172A'}}>
        <canvas ref={cvRef} width={480} height={520} style={{maxWidth:'100%',maxHeight:'100%',cursor:'none'}}/>
      </div>
      {ui.over&&<Over score={ui.score} hs={hs} onRestart={()=>{cancelAnimationFrame(rafRef.current);start()}} onExit={onClose} msg="Catch 💰 in your cart — dodge 💸 taxes!"/>}
      <div style={{position:'absolute',bottom:6,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.3)'}}>Mouse or Arrow keys to move</div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 2 — EXPENSE RUNNER (coin avatar + jump animation + visible obstacles)
// ═══════════════════════════════════════════════════════════
function ExpenseRunner({ onClose }) {
  const cvRef = useRef(null), stRef = useRef(null), rafRef = useRef(null)
  const [ui, setUi] = useState({ score:0, over:false })
  const [hs, setHs] = useState(getHS('runner'))

  const PALS = [
    { sky1:'#FF9A9E', sky2:'#FAD0C4', sky3:'#FFD1DC', ground:'#C0392B', stripe:'#E74C3C' },
    { sky1:'#A1C4FD', sky2:'#C2E9FB', sky3:'#89F7FE', ground:'#2980B9', stripe:'#3498DB' },
    { sky1:'#FFF176', sky2:'#FFE082', sky3:'#FFCA28', ground:'#E67E22', stripe:'#F39C12' },
    { sky1:'#A8EDEA', sky2:'#FED6E3', sky3:'#D4FC79', ground:'#27AE60', stripe:'#2ECC71' },
    { sky1:'#F6D365', sky2:'#FDA085', sky3:'#F093FB', ground:'#8E44AD', stripe:'#9B59B6' },
  ]
  // Big visible obstacles with solid colored backgrounds
  const OBS_DEFS = [
    { e:'💸', h:60, w:55, fly:false, lbl:'TAX',      bg:'#FEE2E2', border:'#EF4444' },
    { e:'🧾', h:44, w:58, fly:false, lbl:'BILL',     bg:'#FEF3C7', border:'#F59E0B' },
    { e:'💳', h:70, w:55, fly:false, lbl:'DEBT',     bg:'#FEE2E2', border:'#EF4444' },
    { e:'✈️', h:46, w:58, fly:true,  lbl:'VACATION', bg:'#EDE9FE', border:'#8B5CF6' },
    { e:'🏥', h:65, w:58, fly:false, lbl:'HOSPITAL', bg:'#FEE2E2', border:'#EF4444' },
    { e:'🎰', h:68, w:55, fly:false, lbl:'GAMBLING', bg:'#FEE2E2', border:'#EF4444' },
  ]

  const start = useCallback(()=>{
    const cv=cvRef.current; if(!cv) return
    const W=cv.width,H=cv.height,ctx=cv.getContext('2d')
    const GY=H-90
    stRef.current={
      px:80,py:GY-26,vy:0,onG:true,spinAngle:0,
      obs:[],coins:[],score:0,frame:0,speed:4.5,
      bgX:0,spawnT:230,palIdx:0,palT:0,
      clouds:[{x:80,y:55,r:55,speed:0.4},{x:280,y:40,r:45,speed:0.3},{x:460,y:65,r:50,speed:0.35}]
    }
    setUi({score:0,over:false})
    const jump=()=>{const s=stRef.current;if(s?.onG){s.vy=-13.5;s.onG=false}}
    const kd=e=>{if(['ArrowUp',' ','w','W'].includes(e.key)){e.preventDefault();jump()}}
    cv.addEventListener('click',jump); window.addEventListener('keydown',kd)

    const loop=()=>{
      const s=stRef.current; if(!s||s.over) return
      s.frame++; s.score=Math.floor(s.frame/5)
      s.speed=4.5+Math.floor(s.frame/500)*0.4
      s.bgX+=s.speed*0.5; s.palT++
      if(s.palT>=350){s.palIdx=(s.palIdx+1)%PALS.length;s.palT=0}
      s.vy+=0.62; s.py+=s.vy
      if(s.py>=GY-26){s.py=GY-26;s.vy=0;s.onG=true}
      // Coin spins faster when in the air
      s.spinAngle+= s.onG ? 0.05 : 0.2

      s.spawnT-=s.speed
      if(s.spawnT<=0){
        const lastObs=s.obs[s.obs.length-1]
        const lastX=lastObs?lastObs.x:-999
        if(lastX<W-320){
          const o={...OBS_DEFS[Math.floor(Math.random()*OBS_DEFS.length)]}
          o.x=W+30; o.y=o.fly?GY-110:GY-o.h
          s.obs.push(o)
          s.coins.push({x:W+160+Math.random()*80,y:GY-85-Math.random()*40})
        }
        s.spawnT=260+Math.random()*120
      }

      s.obs=s.obs.filter(o=>{
        o.x-=s.speed
        // collision: coin center vs obstacle box
        const coinR=24
        const hit=s.px+coinR>o.x+5&&s.px-coinR<o.x+o.w-5&&s.py+coinR>o.y+5&&s.py-coinR<o.y+o.h
        if(hit){s.over=true;saveHS('runner',s.score);setHs(getHS('runner'));setUi({score:s.score,over:true})}
        return o.x>-80
      })
      s.coins=s.coins.filter(c=>{
        c.x-=s.speed
        if(Math.hypot(s.px-c.x,s.py-c.y)<34){s.score+=20;setUi(u=>({...u,score:s.score}));return false}
        return c.x>-20
      })
      setUi(u=>({...u,score:s.score}))
      s.clouds.forEach(cl=>{cl.x-=cl.speed;if(cl.x<-80)cl.x=W+80})

      // ── DRAW ──
      const pal=PALS[s.palIdx]
      const skyG=ctx.createLinearGradient(0,0,0,GY)
      skyG.addColorStop(0,pal.sky1);skyG.addColorStop(0.55,pal.sky2);skyG.addColorStop(1,pal.sky3)
      ctx.fillStyle=skyG; ctx.fillRect(0,0,W,GY)

      // Sun
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.beginPath();ctx.arc(W-70,52,36,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.beginPath();ctx.arc(W-70,52,52,0,Math.PI*2);ctx.fill()

      // Fluffy clouds
      ctx.fillStyle='rgba(255,255,255,0.8)'
      s.clouds.forEach(cl=>{
        ctx.beginPath();ctx.arc(cl.x,cl.y,cl.r,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(cl.x+cl.r*0.6,cl.y-cl.r*0.3,cl.r*0.7,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(cl.x-cl.r*0.5,cl.y-cl.r*0.2,cl.r*0.6,0,Math.PI*2);ctx.fill()
        ctx.beginPath();ctx.arc(cl.x+cl.r*1.1,cl.y,cl.r*0.5,0,Math.PI*2);ctx.fill()
      })

      // Buildings parallax
      for(let i=0;i<5;i++){
        const bx2=((s.bgX*0.2+i*130)%(W+100))-50; const bh=80+i*20
        ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(bx2,GY-bh,55+i*10,bh)
      }

      // Ground
      const gG=ctx.createLinearGradient(0,GY,0,H)
      gG.addColorStop(0,pal.ground);gG.addColorStop(1,'#1a1a1a')
      ctx.fillStyle=gG;ctx.fillRect(0,GY,W,H-GY)
      ctx.fillStyle=pal.stripe;ctx.fillRect(0,GY,W,5)
      for(let i=0;i<9;i++){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(W-((s.bgX*1.8+i*80)%(W+30)),GY+18,42,6)}

      // Shining coins on ground
      s.coins.forEach(c=>{
        ctx.save()
        // Rainbow shine ring
        const gl=ctx.createRadialGradient(c.x,c.y,6,c.x,c.y,22)
        gl.addColorStop(0,'rgba(255,215,0,0.9)');gl.addColorStop(0.5,'rgba(255,215,0,0.4)');gl.addColorStop(1,'transparent')
        ctx.fillStyle=gl;ctx.beginPath();ctx.arc(c.x,c.y,22,0,Math.PI*2);ctx.fill()
        ctx.font='26px serif';ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.shadowColor='#FFD700';ctx.shadowBlur=16;ctx.fillText('💰',c.x,c.y);ctx.shadowBlur=0
        ctx.restore()
      })

      // Obstacles — big solid boxes, fully visible
      s.obs.forEach(o=>{
        ctx.save()
        // Solid background box
        ctx.fillStyle=o.bg;rr(ctx,o.x,o.y,o.w,o.h,10);ctx.fill()
        ctx.strokeStyle=o.border;ctx.lineWidth=3;ctx.stroke()
        // Big emoji
        ctx.font=`${Math.min(o.h*0.75,48)}px serif`;ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.fillText(o.e,o.x+o.w/2,o.y+o.h*0.42)
        // Bold label below emoji
        ctx.font='bold 11px system-ui';ctx.fillStyle='#1a1a1a';ctx.textBaseline='alphabetic'
        ctx.fillText(o.lbl,o.x+o.w/2,o.y+o.h-6)
        ctx.restore()
      })

      // ── Coin avatar (player) ──
      const px=s.px, py=s.py
      // Shadow on ground
      if(s.onG){ctx.fillStyle='rgba(0,0,0,0.18)';ctx.beginPath();ctx.ellipse(px,GY-2,20,6,0,0,Math.PI*2);ctx.fill()}
      ctx.save();ctx.translate(px,py)
      // Spin effect: squish X when spinning fast
      const spinScaleX=s.onG?1:Math.abs(Math.cos(s.spinAngle))*0.3+0.7
      ctx.scale(spinScaleX,1)
      // Outer glow
      ctx.shadowColor='#FCD34D';ctx.shadowBlur=18
      ctx.fillStyle='#FCD34D';ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill()
      ctx.shadowBlur=0
      // Rim
      ctx.strokeStyle='#D97706';ctx.lineWidth=3.5;ctx.stroke()
      // Inner shine
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.beginPath();ctx.arc(-7,-8,10,0,Math.PI*2);ctx.fill()
      // Dollar sign
      ctx.fillStyle='#92400E';ctx.font='bold 22px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,2)
      ctx.restore()

      // Score
      ctx.font='bold 18px system-ui';ctx.fillStyle='white';ctx.textAlign='left';ctx.textBaseline='alphabetic'
      ctx.shadowColor='rgba(0,0,0,0.7)';ctx.shadowBlur=6
      ctx.fillText(`${s.score}m`,14,34);ctx.shadowBlur=0

      rafRef.current=requestAnimationFrame(loop)
    }
    loop()
    return()=>{cv.removeEventListener('click',jump);window.removeEventListener('keydown',kd);cancelAnimationFrame(rafRef.current)}
  },[])
  useEffect(()=>{const c=start();return()=>{c?.();cancelAnimationFrame(rafRef.current)}},[start])
  return(
    <Shell title="Expense Runner" emoji="🏃" onClose={onClose} score={ui.score} hs={hs}>
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#A1C4FD'}}>
        <canvas ref={cvRef} width={580} height={380} style={{maxWidth:'100%',maxHeight:'100%',cursor:'pointer'}}/>
      </div>
      {ui.over&&<Over score={ui.score} hs={hs} onRestart={()=>{cancelAnimationFrame(rafRef.current);start()}} onExit={onClose} msg="Jump over expenses, collect 💰!"/>}
      <div style={{position:'absolute',bottom:6,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.5)'}}>Click / Space / ↑ to jump</div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 3 — STOCK CLICKER (cooldown window — must act or lose life)
// ═══════════════════════════════════════════════════════════
function StockClicker({ onClose }) {
  const cvRef=useRef(null),stRef=useRef(null),rafRef=useRef(null)
  const [phase,setPhase]=useState('idle')
  const [ui,setUi]=useState({score:0,lives:3,level:1})
  const [hs,setHs]=useState(getHS('stocks'))

  const start=useCallback(()=>{
    const cv=cvRef.current; if(!cv) return
    const W=cv.width,H=cv.height,ctx=cv.getContext('2d')
    stRef.current={
      price:100,hist:[100],mode:'rising',modeTimer:0,modeDuration:65,
      score:0,lives:3,level:1,holding:false,buyP:0,
      frame:0,flashT:0,flash:null,floats:[],
      // Window system: a countdown appears — must BUY or SELL within it
      winOpen:false,winTimer:0,winDur:150,winType:null,
      coolTimer:60,coolDur:80,
      missFlash:0
    }
    setUi({score:0,lives:3,level:1}); setPhase('playing')

    const handleClick=()=>{
      const s=stRef.current; if(!s||s.over) return
      if(!s.winOpen) return
      if(s.winType==='buy'&&!s.holding){
        s.holding=true; s.buyP=s.price; s.flash='buy'; s.flashT=15
        s.winOpen=false; s.winTimer=0; s.coolTimer=s.coolDur
        s.floats.push({x:W/2,y:H-155,text:'BUY @ $'+s.price.toFixed(0),color:'#8B5CF6',life:55,vy:-1.2})
      } else if(s.winType==='sell'&&s.holding){
        const profit=s.price-s.buyP
        if(profit>1){
          s.score++; s.level=Math.floor(s.score/4)+1
          s.floats.push({x:W/2,y:H-155,text:'+1 ⭐  +$'+profit.toFixed(0),color:'#10B981',life:65,vy:-1.4})
          s.flash='profit'; s.flashT=28
        } else {
          s.lives--
          s.floats.push({x:W/2,y:H-155,text:'Sold at loss! -❤️',color:'#EF4444',life:65,vy:-1.4})
          s.flash='loss'; s.flashT=28
          if(s.lives<=0){s.over=true;saveHS('stocks',s.score);setHs(getHS('stocks'));setPhase('over');setUi(u=>({...u,score:s.score,lives:0}));return}
        }
        s.holding=false; s.buyP=0
        s.winOpen=false; s.winTimer=0; s.coolTimer=s.coolDur
        s.modeDuration=Math.max(28,65-s.level*6)
        s.winDur=Math.max(70,150-s.level*14)
        s.coolDur=Math.max(35,80-s.level*5)
        setUi(u=>({...u,score:s.score,lives:s.lives,level:s.level}))
      }
    }
    cv.addEventListener('click',handleClick)
    const kd=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();handleClick()}}
    window.addEventListener('keydown',kd)

    const loop=()=>{
      const s=stRef.current; if(!s||s.over) return
      s.frame++
      if(s.flashT>0) s.flashT--
      if(s.missFlash>0) s.missFlash--

      // Price movement
      s.modeTimer++
      if(s.modeTimer>=s.modeDuration){
        s.modeTimer=0
        const r=Math.random()
        if(s.mode==='rising') s.mode=r<0.55?'peak':'falling'
        else if(s.mode==='peak') s.mode='falling'
        else if(s.mode==='falling') s.mode=r<0.55?'crash':'rising'
        else s.mode='rising'
      }
      const noise=(Math.random()-0.49)*(0.9+s.level*0.12)
      let delta=0
      if(s.mode==='rising') delta=1.5+Math.random()*0.8+noise
      else if(s.mode==='falling') delta=-(1.5+Math.random()*0.8)+noise
      else if(s.mode==='peak'){delta=Math.sin(s.frame*0.4)*0.9+noise;if(s.price<175)delta+=2}
      else{delta=Math.sin(s.frame*0.4)*0.9+noise;if(s.price>25)delta-=2}
      s.price=Math.max(8,Math.min(192,s.price+delta))
      s.hist.push(s.price); if(s.hist.length>W-90)s.hist.shift()
      s.floats=s.floats.filter(f=>{f.y+=f.vy;f.life--;return f.life>0})

      // Window timing
      if(s.winOpen){
        s.winTimer++
        if(s.winTimer>=s.winDur){
          // MISSED the window — lose a life
          s.winOpen=false; s.winTimer=0; s.coolTimer=s.coolDur
          s.lives--; s.missFlash=40
          s.floats.push({x:W/2,y:H/2-40,text:'TOO SLOW! -❤️',color:'#EF4444',life:80,vy:-1})
          setUi(u=>({...u,lives:s.lives}))
          if(s.lives<=0){s.over=true;saveHS('stocks',s.score);setHs(getHS('stocks'));setPhase('over');setUi(u=>({...u,score:s.score,lives:0}))}
          if(s.holding){s.holding=false;s.buyP=0} // force sell
        }
      } else {
        if(s.coolTimer>0) s.coolTimer--
        else {
          // Open a window based on price position
          if(!s.holding&&(s.mode==='crash'||s.mode==='falling')){
            s.winOpen=true; s.winTimer=0; s.winType='buy'
          } else if(s.holding&&(s.mode==='peak'||s.mode==='rising')){
            s.winOpen=true; s.winTimer=0; s.winType='sell'
          } else {
            s.coolTimer=30
          }
        }
      }

      // ── DRAW ──
      ctx.fillStyle='#0A1628'; ctx.fillRect(0,0,W,H)

      // Miss flash red
      if(s.missFlash>0){ctx.fillStyle=`rgba(239,68,68,${(s.missFlash/40)*0.3})`;ctx.fillRect(0,0,W,H)}

      const modeColors={rising:'#10B981',peak:'#FCD34D',falling:'#EF4444',crash:'#EF4444'}
      const modeLabels={rising:'📈 RISING',peak:'🔝 PEAK',falling:'📉 FALLING',crash:'💥 CRASH'}
      ctx.fillStyle=modeColors[s.mode]+'22'; ctx.fillRect(0,0,W,22)
      ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.fillStyle=modeColors[s.mode]
      ctx.fillText(modeLabels[s.mode],W/2,15)

      const cX=55,cY=26,cW=W-75,cH=H-148
      ctx.fillStyle='#0D1B2E'; rr(ctx,cX,cY,cW,cH,8); ctx.fill()
      ctx.strokeStyle='#1E3A5F'; ctx.lineWidth=1; ctx.stroke()
      for(let i=0;i<=4;i++){
        const y=cY+(cH/4)*i
        ctx.strokeStyle='#1E3A5F33';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(cX,y);ctx.lineTo(cX+cW,y);ctx.stroke()
        ctx.font='9px system-ui';ctx.fillStyle='#475569';ctx.textAlign='right'
        ctx.fillText(`$${Math.round(192-(i/4)*184)}`,cX-4,y+3)
      }
      if(s.hist.length>1){
        const rising2=s.price>=s.hist[0], lc=rising2?'#10B981':'#EF4444'
        ctx.beginPath()
        s.hist.forEach((p,i)=>{const x=cX+(i/(s.hist.length-1))*cW;const y=cY+cH-((p-8)/184)*cH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
        const aG=ctx.createLinearGradient(0,cY,0,cY+cH)
        aG.addColorStop(0,lc+'55');aG.addColorStop(1,'transparent')
        ctx.lineTo(cX+cW,cY+cH);ctx.lineTo(cX,cY+cH);ctx.closePath();ctx.fillStyle=aG;ctx.fill()
        ctx.beginPath()
        s.hist.forEach((p,i)=>{const x=cX+(i/(s.hist.length-1))*cW;const y=cY+cH-((p-8)/184)*cH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
        ctx.strokeStyle=lc;ctx.lineWidth=2.5;ctx.stroke()
        const dY=cY+cH-((s.price-8)/184)*cH
        ctx.fillStyle='#FCD34D';ctx.shadowColor='#FCD34D';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(cX+cW,dY,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0
      }
      if(s.holding){
        const bY=cY+cH-((s.buyP-8)/184)*cH
        ctx.strokeStyle='#8B5CF6';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(cX,bY);ctx.lineTo(cX+cW,bY);ctx.stroke();ctx.setLineDash([])
        const prof=s.price-s.buyP;ctx.font='bold 11px system-ui';ctx.fillStyle=prof>0?'#10B981':'#EF4444';ctx.textAlign='right'
        ctx.fillText((prof>0?'+':'')+prof.toFixed(0),cX+cW-6,cY+cH-((s.price-8)/184)*cH-8)
      }

      // ── WINDOW indicator ──
      if(s.winOpen){
        const pct=1-(s.winTimer/s.winDur)
        const wc=s.winType==='buy'?'#22C55E':'#F59E0B'
        const pulse=Math.sin(s.frame*0.3)*3
        // Pulsing border
        ctx.strokeStyle=wc;ctx.lineWidth=3+pulse;rr(ctx,cX,cY,cW,cH,8);ctx.stroke()
        // Window countdown bar at bottom of chart
        ctx.fillStyle='#1E293B';ctx.fillRect(cX,cY+cH+4,cW,10)
        ctx.fillStyle=wc;ctx.fillRect(cX,cY+cH+4,cW*pct,10)
        // Big label
        ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillStyle=wc
        ctx.shadowColor=wc;ctx.shadowBlur=12
        ctx.fillText(s.winType==='buy'?'🛒 BUY NOW! — click or space':'💰 SELL NOW! — click or space',W/2,cY+cH+28)
        ctx.shadowBlur=0
      } else if(s.coolTimer>0){
        ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#475569'
        ctx.fillText(`Next window in ${Math.ceil((s.coolTimer/60)*1000/1000).toFixed(1)}s`,W/2,cY+cH+22)
      }

      if(s.flashT>0){const a=(s.flashT/28)*0.28;ctx.fillStyle=s.flash==='profit'?`rgba(16,185,129,${a})`:s.flash==='buy'?`rgba(139,92,246,${a})`:`rgba(239,68,68,${a})`;ctx.fillRect(0,0,W,H)}
      s.floats.forEach(f=>{ctx.globalAlpha=f.life/65;ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1})

      ctx.fillStyle='#0A1628';ctx.fillRect(0,H-115,W,115)
      ctx.fillStyle='#1E3A5F';ctx.fillRect(0,H-115,W,2)
      ctx.font='bold 36px system-ui';ctx.textAlign='center';ctx.fillStyle='#FCD34D'
      ctx.fillText(`$${s.price.toFixed(0)}`,W/2,H-65)
      const maxD=Math.min(s.score,12)
      for(let i=0;i<maxD;i++){ctx.font='14px serif';ctx.textAlign='left';ctx.fillText('⭐',14+i*22,H-44)}
      if(s.score>12){ctx.font='10px system-ui';ctx.fillStyle='#FCD34D';ctx.fillText(`+${s.score-12}`,14+12*22,H-40)}

      const btnActive=s.winOpen
      const btnC=!btnActive?'#334155':s.winType==='buy'?'#22C55E':'#F59E0B'
      ctx.fillStyle=btnC;rr(ctx,W/2-120,H-36,240,28,8);ctx.fill()
      ctx.font='bold 13px system-ui';ctx.fillStyle=btnActive?'white':'#475569';ctx.textAlign='center'
      ctx.fillText(
        !btnActive?(s.holding?'Holding... wait for SELL window':'Waiting for BUY window...'):
        s.winType==='buy'?'🛒 CLICK TO BUY':'💰 CLICK TO SELL',
        W/2,H-16
      )
      ctx.font='10px system-ui';ctx.fillStyle='#475569';ctx.textAlign='right'
      ctx.fillText(`Level ${s.level}`,W-8,H-5)
      rafRef.current=requestAnimationFrame(loop)
    }
    loop()
    return()=>{cv.removeEventListener('click',handleClick);window.removeEventListener('keydown',kd);cancelAnimationFrame(rafRef.current)}
  },[])

  useEffect(()=>{if(phase==='playing'){const c=start();return()=>{c?.();cancelAnimationFrame(rafRef.current)}}},[phase,start])
  return(
    <Shell title="Stock Clicker" emoji="📈" onClose={onClose} score={ui.score} hs={hs} lives={ui.lives}
      extra={<span style={{fontSize:11,color:'#A78BFA'}}>Lv.{ui.level}</span>}>
      {phase==='idle'&&(
        <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0A1628',gap:14}}>
          <div style={{fontSize:52}}>📈</div>
          <div style={{fontSize:20,fontWeight:700,color:'white'}}>Stock Clicker</div>
          <div style={{fontSize:13,color:'#94A3B8',textAlign:'center',maxWidth:320,lineHeight:1.6}}>A window flashes — BUY when it crashes, SELL when it peaks. You must act within the time window or lose a life! Gets harder each level.</div>
          <div style={{display:'flex',gap:12}}>
            <div style={{padding:'6px 14px',background:'#22C55E33',color:'#22C55E',border:'1px solid #22C55E',borderRadius:8,fontSize:12}}>🛒 BUY window = act fast</div>
            <div style={{padding:'6px 14px',background:'#F59E0B33',color:'#F59E0B',border:'1px solid #F59E0B',borderRadius:8,fontSize:12}}>💰 SELL window = act fast</div>
          </div>
          <button onClick={()=>setPhase('playing')} style={{padding:'11px 30px',background:'#10B981',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}}>Start Trading!</button>
        </div>
      )}
      {phase==='playing'&&(
        <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0A1628'}}>
          <canvas ref={cvRef} width={440} height={470} style={{maxWidth:'100%',maxHeight:'100%',cursor:'pointer'}}/>
        </div>
      )}
      {phase==='over'&&<Over score={ui.score} hs={hs} onRestart={()=>setPhase('idle')} onExit={onClose} msg="Act fast when the window opens!"/>}
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 4 — GOOD OR BAD (unchanged — good)
// ═══════════════════════════════════════════════════════════
function BudgetReflex({ onClose }) {
  const [gs,setGs]=useState({phase:'idle'})
  const timerRef=useRef(null)
  const [hs,setHs]=useState(getHS('reflex'))
  const CARDS=[
    {e:'🏠',lbl:'Pay Rent',ans:'good',reason:'Essential living cost'},
    {e:'💊',lbl:'Buy Medicine',ans:'good',reason:'Health is priority'},
    {e:'💰',lbl:'Save 20%',ans:'good',reason:'Pay yourself first!'},
    {e:'📈',lbl:'Invest Monthly',ans:'good',reason:'Wealth grows over time'},
    {e:'🥦',lbl:'Buy Groceries',ans:'good',reason:'Food is essential'},
    {e:'📚',lbl:'Buy Books',ans:'good',reason:'Education pays off'},
    {e:'💡',lbl:'Pay Bills',ans:'good',reason:'Keep the lights on!'},
    {e:'🎓',lbl:'Take a Course',ans:'good',reason:'Skills earn more'},
    {e:'🏋️',lbl:'Join a Gym',ans:'good',reason:'Health = productivity'},
    {e:'🚗',lbl:'Buy Used Car',ans:'good',reason:'Practical investment'},
    {e:'🎁',lbl:'Emergency Fund',ans:'good',reason:'Safety net is essential'},
    {e:'🎰',lbl:'Gamble Savings',ans:'bad',reason:'Gambling destroys wealth'},
    {e:'☕',lbl:'$8 Coffee Daily',ans:'bad',reason:'$240/month wasted!'},
    {e:'💳',lbl:'Pay Min Balance',ans:'bad',reason:'Interest trap!'},
    {e:'👟',lbl:'Impulse Shopping',ans:'bad',reason:'Unplanned spending'},
    {e:'🍔',lbl:'Fast Food 3x/day',ans:'bad',reason:'Expensive & unhealthy'},
    {e:'📱',lbl:'10 Subscriptions',ans:'bad',reason:'Subscription creep'},
    {e:'🤑',lbl:'FOMO Crypto Bet',ans:'bad',reason:'Never invest from FOMO'},
    {e:'🎮',lbl:'Skip Work to Game',ans:'bad',reason:'Income is everything'},
    {e:'🚙',lbl:'Lease Luxury Car',ans:'bad',reason:'Depreciates fast'},
  ]
  const BGS=['linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)','linear-gradient(135deg,#0d1b2a,#1b4332,#2d6a4f)','linear-gradient(135deg,#2d1b69,#11998e,#38ef7d)','linear-gradient(135deg,#3d0c02,#c31432,#240b36)','linear-gradient(135deg,#0f0c29,#302b63,#24243e)']
  const startGame=()=>{setGs({phase:'playing',score:0,lives:3,idx:0,cards:[...CARDS].sort(()=>Math.random()-0.5),tl:100,result:null,reason:'',streak:0,bgIdx:0,speed:0.55})}
  useEffect(()=>{
    if(gs.phase!=='playing') return
    if(gs.tl<=0){doAnswer(null);return}
    timerRef.current=setTimeout(()=>setGs(s=>({...s,tl:Math.max(0,s.tl-s.speed)})),60)
    return()=>clearTimeout(timerRef.current)
  })
  const doAnswer=useCallback((ans)=>{
    if(gs.phase!=='playing') return
    clearTimeout(timerRef.current)
    const card=gs.cards[gs.idx]
    const ok=ans===card?.ans
    const streak=ok?gs.streak+1:0
    const pts=ok?Math.round(12+streak*4+(gs.tl/100)*15):0
    const score=gs.score+pts
    const lives=ok?gs.lives:gs.lives-1
    const idx=gs.idx+1
    const speed=Math.min(3.5,0.55+Math.floor(score/30)*0.22)
    if(lives<=0||idx>=gs.cards.length){saveHS('reflex',score);setHs(getHS('reflex'));setGs(s=>({...s,phase:'over',score}));return}
    setGs(s=>({...s,score,lives,idx,tl:100,result:ok?'ok':'no',reason:card?.reason||'',streak,bgIdx:(s.bgIdx+(ok?0:1))%BGS.length,speed}))
    setTimeout(()=>setGs(s=>s.phase==='playing'?{...s,result:null,reason:''}:s),700)
  },[gs])
  const card=gs.cards?.[gs.idx]
  return(
    <Shell title="Good or Bad?" emoji="⚡" onClose={onClose} score={gs.score||0} hs={hs} lives={gs.lives}>
      <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:16,background:gs.phase==='playing'?BGS[gs.bgIdx||0]:BGS[0],transition:'background 0.5s'}}>
        {gs.phase==='idle'&&(<>
          <div style={{fontSize:62}}>💸</div>
          <div style={{fontSize:22,fontWeight:700,color:'white'}}>Good or Bad?</div>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.8)',textAlign:'center',maxWidth:320,lineHeight:1.7}}>An expense card appears. Is it <span style={{color:'#4ADE80',fontWeight:700}}>GOOD</span> or <span style={{color:'#F87171',fontWeight:700}}>BAD</span> for your finances? Answer fast to score more!</div>
          <div style={{display:'flex',gap:12}}>
            <div style={{padding:'8px 20px',background:'#16A34A',color:'white',borderRadius:12,fontSize:14,fontWeight:700}}>✅ GOOD</div>
            <div style={{padding:'8px 20px',background:'#DC2626',color:'white',borderRadius:12,fontSize:14,fontWeight:700}}>❌ BAD</div>
          </div>
          <button onClick={startGame} style={{padding:'11px 32px',background:'rgba(255,255,255,0.18)',color:'white',border:'2px solid rgba(255,255,255,0.4)',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8}}>Start!</button>
        </>)}
        {gs.phase==='playing'&&card&&(<>
          <div style={{width:'100%',maxWidth:360,background:'rgba(0,0,0,0.3)',borderRadius:12,height:14,overflow:'hidden'}}>
            <div style={{width:`${gs.tl}%`,height:'100%',background:gs.tl>60?'#4ADE80':gs.tl>30?'#FCD34D':'#EF4444',borderRadius:12,transition:`width ${60/1000}s linear`}}/>
          </div>
          {gs.streak>=2&&<div style={{fontSize:15,color:'white',fontWeight:700,background:'rgba(0,0,0,0.25)',padding:'3px 14px',borderRadius:18}}>🔥 {gs.streak}x Streak!</div>}
          <div style={{width:230,height:230,background:gs.result==='ok'?'#DCFCE7':gs.result==='no'?'#FEE2E2':'white',borderRadius:28,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,border:`4px solid ${gs.result==='ok'?'#16A34A':gs.result==='no'?'#DC2626':'transparent'}`,boxShadow:'0 16px 48px rgba(0,0,0,0.3)',transform:gs.result?'scale(1.04)':'scale(1)',transition:'all 0.18s'}}>
            <div style={{fontSize:86}}>{card.e}</div>
            <div style={{fontSize:15,fontWeight:700,color:'#0F172A',textAlign:'center',padding:'0 12px'}}>{card.lbl}</div>
            {gs.result&&<div style={{fontSize:11,color:gs.result==='ok'?'#16A34A':'#DC2626',fontWeight:600,textAlign:'center',padding:'0 12px'}}>{gs.reason}</div>}
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{gs.idx+1} / {gs.cards.length}</div>
          <div style={{display:'flex',gap:14,width:'100%',maxWidth:360}}>
            <button onClick={()=>doAnswer('good')} style={{flex:1,padding:'20px 8px',background:'#16A34A',color:'white',border:'3px solid #4ADE80',borderRadius:18,fontSize:18,fontWeight:800,cursor:'pointer',boxShadow:'0 6px 20px #16A34A66'}}>✅ GOOD</button>
            <button onClick={()=>doAnswer('bad')}  style={{flex:1,padding:'20px 8px',background:'#DC2626',color:'white',border:'3px solid #F87171',borderRadius:18,fontSize:18,fontWeight:800,cursor:'pointer',boxShadow:'0 6px 20px #DC262666'}}>❌ BAD</button>
          </div>
        </>)}
        {gs.phase==='over'&&<Over score={gs.score} hs={hs} onRestart={startGame} onExit={onClose} msg="Is this expense Good or Bad?"/>}
      </div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 6 — MONEY DEFENDER (colorful bg, shield+instakill drops at wave 3+)
// ═══════════════════════════════════════════════════════════
function MoneyDefender({ onClose }) {
  const cvRef=useRef(null),stRef=useRef(null),rafRef=useRef(null)
  const mouseRef=useRef({x:300,y:250}),keysRef=useRef({})
  const [ui,setUi]=useState({score:0,wave:1,lives:3,over:false,between:false})
  const [hs,setHs]=useState(getHS('defender'))

  const RW=780,RH=540
  const BASE_SPD=1.0
  const TYPES=[
    {id:'food',e:'🍔',color:'#F97316',hp:2, spd:BASE_SPD,     sz:13,pts:10},
    {id:'car', e:'🚗',color:'#3B82F6',hp:1, spd:BASE_SPD*1.2,sz:10,pts:15},
    {id:'shop',e:'🛍️',color:'#EC4899',hp:8, spd:BASE_SPD*0.7,sz:17,pts:40},
    {id:'sub', e:'📱',color:'#8B5CF6',hp:2, spd:BASE_SPD,     sz:12,pts:20,shoot:true},
    {id:'fun', e:'🎬',color:'#10B981',hp:2, spd:BASE_SPD*1.1,sz:12,pts:15,stun:true},
    {id:'boss',e:'💀',color:'#DC2626',hp:25,spd:BASE_SPD*0.8,sz:26,pts:150,boss:true},
  ]
  const WAVES=[
    {n:10,types:['food']},
    {n:15,types:['food','car']},
    {n:20,types:['food','car','fun']},
    {n:25,types:['food','car','fun','sub']},
    {n:30,types:['food','car','fun','sub','shop']},
    {n:35,types:['food','car','fun','sub','shop','boss']},
    {n:40,types:['food','car','fun','sub','shop','boss']},
    {n:45,types:['food','car','fun','sub','shop','boss']},
  ]

  // Vivid colorful palettes per wave
  const BGPALS=[
    {fl:'#1a1a3e',wa:'#12122a',ac:'#6366F1',stars:'#818CF8'},
    {fl:'#0a2e1a',wa:'#061a0e',ac:'#22C55E',stars:'#86EFAC'},
    {fl:'#2e0a1a',wa:'#1a0612',ac:'#EC4899',stars:'#F9A8D4'},
    {fl:'#1a2e0a',wa:'#0e1a06',ac:'#84CC16',stars:'#BEF264'},
    {fl:'#2e1a0a',wa:'#1a0e06',ac:'#F97316',stars:'#FED7AA'},
    {fl:'#0a1a2e',wa:'#060e1a',ac:'#0EA5E9',stars:'#7DD3FC'},
    {fl:'#1a0a2e',wa:'#0e061a',ac:'#A855F7',stars:'#D8B4FE'},
    {fl:'#2e2a0a',wa:'#1a1606',ac:'#EAB308',stars:'#FDE047'},
  ]

  const makeWave=useCallback((waveNum,score,lives)=>{
    const def=WAVES[Math.min(waveNum-1,WAVES.length-1)]
    const hm=1+(waveNum-1)*0.3
    const zombies=[]
    for(let i=0;i<def.n;i++){
      const tId=def.types[Math.floor(Math.random()*def.types.length)]
      const tmpl=TYPES.find(t=>t.id===tId)
      const side=Math.floor(Math.random()*4)
      const x=side<2?Math.random()*RW:side===2?0:RW
      const y=side<2?(side===0?0:RH):Math.random()*RH
      zombies.push({...tmpl,x,y,hp:Math.ceil(tmpl.hp*hm),maxHp:Math.ceil(tmpl.hp*hm),frame:Math.random()*60,shT:0,stT:0,id:Math.random().toString(36).substr(2,8)})
    }
    const pal=BGPALS[(waveNum-1)%BGPALS.length]

    // Power-ups: only spawn at wave 3+, one at a time, with random delay after cooldown
    const powerups=[]
    return {
      player:{x:RW/2,y:RH/2,invT:0,stT:0,frame:0,shield:false,instakill:false},
      zombies,bullets:[],eBullets:[],parts:[],floats:[],
      score,wave:waveNum,lives,frame:0,over:false,waveOk:false,pal,
      powerups,
      // Powerup spawn timers
      puCooldown: waveNum>=3 ? 300+Math.floor(Math.random()*200) : 99999, // frames until next drop
      puActive: null, // 'shield' | 'instakill' | null
      puActiveTimer: 0,
      shieldOn: false, instakillOn: false,
    }
  },[])

  const runLoop=useCallback((ctx)=>{
    const loop=()=>{
      const s=stRef.current; if(!s||s.over||s.waveOk) return
      s.frame++
      const p=s.player,SPD=3.5
      if(p.stT>0)p.stT--;if(p.invT>0)p.invT--;p.frame++
      const k=keysRef.current
      if(p.stT<=0){
        if(k['ArrowLeft']||k['a'])p.x=Math.max(p.x-SPD,28)
        if(k['ArrowRight']||k['d'])p.x=Math.min(p.x+SPD,RW-28)
        if(k['ArrowUp']||k['w'])p.y=Math.max(p.y-SPD,28)
        if(k['ArrowDown']||k['s'])p.y=Math.min(p.y+SPD,RH-28)
      }
      if(s.frame%10===0){const a=Math.atan2(mouseRef.current.y-p.y,mouseRef.current.x-p.x);s.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*15,vy:Math.sin(a)*15,life:60})}

      // Power-up logic
      if(s.puActiveTimer>0){
        s.puActiveTimer--
        if(s.puActiveTimer===0){
          if(s.puActive==='shield')s.shieldOn=false
          if(s.puActive==='instakill')s.instakillOn=false
          s.puActive=null
          // Restart cooldown with random extra delay
          s.puCooldown=400+Math.floor(Math.random()*300)
        }
      }
      if(s.puCooldown>0){
        s.puCooldown--
        if(s.puCooldown===0&&!s.puActive&&s.wave>=3){
          // Drop a random power-up on the floor
          const type=Math.random()<0.5?'shield':'instakill'
          s.powerups.push({
            type,
            x:60+Math.random()*(RW-120),
            y:60+Math.random()*(RH-120),
            pulse:0,
            label:type==='shield'?'🛡️':'⚡'
          })
        }
      }
      // Powerup pickup
      s.powerups=s.powerups.filter(pu=>{
        pu.pulse++
        if(Math.hypot(pu.x-p.x,pu.y-p.y)<30){
          s.puActive=pu.type
          if(pu.type==='shield'){s.shieldOn=true;s.floats.push({x:p.x,y:p.y-40,t:'🛡️ SHIELD!',c:'#60A5FA',life:60})}
          else{s.instakillOn=true;s.floats.push({x:p.x,y:p.y-40,t:'⚡ INSTA-KILL!',c:'#FCD34D',life:60})}
          s.puActiveTimer=360 // active for 6 seconds
          // No new cooldown until current expires (handled above)
          return false
        }
        return true
      })

      s.bullets=s.bullets.filter(b=>{
        b.x+=b.vx;b.y+=b.vy;b.life--
        if(b.x<0||b.x>RW||b.y<0||b.y>RH||b.life<=0) return false
        let hit=false
        s.zombies=s.zombies.filter(z=>{
          if(hit||Math.hypot(b.x-z.x,b.y-z.y)>=z.sz+5) return true
          const dmg=s.instakillOn?999:1
          z.hp-=dmg;hit=true
          for(let i=0;i<4;i++)s.parts.push({x:z.x,y:z.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:16,c:z.color})
          if(z.hp<=0){s.score+=z.pts;s.floats.push({x:z.x,y:z.y-18,t:`+${z.pts}`,c:'#FCD34D',life:45});setUi(u=>({...u,score:s.score}));return false}
          return true
        })
        return !hit
      })

      s.zombies.forEach(z=>{
        z.frame++;if(z.stT>0){z.stT--;return}
        const a=Math.atan2(p.y-z.y,p.x-z.x)
        z.x+=Math.cos(a)*z.spd;z.y+=Math.sin(a)*z.spd
        z.x=Math.max(z.sz,Math.min(RW-z.sz,z.x));z.y=Math.max(z.sz,Math.min(RH-z.sz,z.y))
        if(z.shoot){z.shT++;if(z.shT>=120){z.shT=0;const ang=Math.atan2(p.y-z.y,p.x-z.x);s.eBullets.push({x:z.x,y:z.y,vx:Math.cos(ang)*4,vy:Math.sin(ang)*4,life:80})}}
        if(Math.hypot(z.x-p.x,z.y-p.y)<z.sz+14&&p.invT<=0){
          if(s.shieldOn){
            s.shieldOn=false;s.puActive=null;s.puActiveTimer=0
            s.puCooldown=400+Math.floor(Math.random()*300)
            s.floats.push({x:p.x,y:p.y-40,t:'🛡️ BLOCKED!',c:'#60A5FA',life:60})
          } else {
            s.lives--;p.invT=130;if(z.stun)p.stT=80;setUi(u=>({...u,lives:s.lives}))
            if(s.lives<=0){s.over=true;saveHS('defender',s.score);setHs(getHS('defender'));setUi({score:s.score,wave:s.wave,lives:0,over:true,between:false})}
          }
        }
      })

      s.eBullets=s.eBullets.filter(eb=>{
        eb.x+=eb.vx;eb.y+=eb.vy;eb.life--
        if(eb.x<0||eb.x>RW||eb.y<0||eb.y>RH||eb.life<=0) return false
        if(Math.hypot(eb.x-p.x,eb.y-p.y)<14&&p.invT<=0){
          if(s.shieldOn){s.shieldOn=false;s.puActive=null;s.puActiveTimer=0;s.puCooldown=400+Math.floor(Math.random()*300)}
          else{s.lives--;p.invT=100;setUi(u=>({...u,lives:s.lives}));if(s.lives<=0){s.over=true;saveHS('defender',s.score);setHs(getHS('defender'));setUi({score:s.score,wave:s.wave,lives:0,over:true,between:false})}}
          return false
        }
        return true
      })

      s.parts=s.parts.filter(p2=>{p2.x+=p2.vx;p2.y+=p2.vy;p2.vx*=0.9;p2.vy*=0.9;p2.life--;return p2.life>0})
      s.floats=s.floats.filter(f=>{f.y-=0.75;f.life--;return f.life>0})
      if(s.zombies.length===0&&!s.waveOk){s.waveOk=true;setUi(u=>({...u,between:true,wave:s.wave,score:s.score}))}

      // ── DRAW ──
      const pl2=s.pal
      // Rich colorful background
      const bgG=ctx.createLinearGradient(0,0,RW,RH)
      bgG.addColorStop(0,pl2.fl);bgG.addColorStop(1,pl2.wa)
      ctx.fillStyle=bgG;ctx.fillRect(0,0,RW,RH)

      // Colorful stars
      for(let i=0;i<40;i++){
        const sx=(i*97+s.frame*0.2)%RW
        const sy2=(i*137)%RH
        const r=i%5===0?2.5:1.2
        ctx.fillStyle=pl2.stars;ctx.globalAlpha=0.3+Math.sin(s.frame*0.05+i)*0.2
        ctx.beginPath();ctx.arc(sx,sy2,r,0,Math.PI*2);ctx.fill()
        ctx.globalAlpha=1
      }

      // Walls with accent color
      ctx.fillStyle=pl2.wa
      ctx.fillRect(0,0,RW,22);ctx.fillRect(0,RH-22,RW,22);ctx.fillRect(0,22,22,RH-48);ctx.fillRect(RW-22,22,22,RH-48)
      ctx.fillStyle=pl2.ac
      ctx.fillRect(0,21,RW,3);ctx.fillRect(0,RH-24,RW,3);ctx.fillRect(21,0,3,RH);ctx.fillRect(RW-24,0,3,RH)
      // Floor tile grid
      ctx.strokeStyle=pl2.ac+'22';ctx.lineWidth=0.7
      for(let gx=46;gx<RW-22;gx+=46){ctx.beginPath();ctx.moveTo(gx,24);ctx.lineTo(gx,RH-24);ctx.stroke()}
      for(let gy=46;gy<RH-22;gy+=46){ctx.beginPath();ctx.moveTo(24,gy);ctx.lineTo(RW-24,gy);ctx.stroke()}

      // Power-up drops on floor
      s.powerups.forEach(pu=>{
        const pulse=Math.sin(pu.pulse*0.12)*4
        ctx.save();ctx.translate(pu.x,pu.y)
        // Big glowing ring
        ctx.beginPath();ctx.arc(0,0,24+pulse,0,Math.PI*2)
        ctx.fillStyle=pu.type==='shield'?'rgba(96,165,250,0.25)':'rgba(252,211,77,0.25)';ctx.fill()
        ctx.strokeStyle=pu.type==='shield'?'#60A5FA':'#FCD34D';ctx.lineWidth=2.5;ctx.stroke()
        ctx.font='28px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pu.label,0,0)
        ctx.font='bold 10px system-ui';ctx.fillStyle=pu.type==='shield'?'#93C5FD':'#FCD34D';ctx.textBaseline='alphabetic'
        ctx.fillText(pu.type==='shield'?'SHIELD':'INSTA-KILL',0,26)
        ctx.restore()
      })

      s.parts.forEach(pt=>{ctx.globalAlpha=pt.life/16;ctx.fillStyle=pt.c;ctx.beginPath();ctx.arc(pt.x,pt.y,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1})

      s.zombies.forEach(z=>{
        const bob=Math.sin(z.frame*0.14)*2
        ctx.save();ctx.translate(z.x,z.y+bob)
        // Normal size — no scaling
        ctx.fillStyle=z.color;ctx.beginPath();ctx.arc(0,0,z.sz,0,Math.PI*2);ctx.fill()
        ctx.strokeStyle=z.color+'88';ctx.lineWidth=4;ctx.stroke()
        if(z.boss){ctx.font='14px serif';ctx.textAlign='center';ctx.fillText('👑',0,-z.sz-8)}
        ctx.font=`${z.sz*1.2}px serif`;ctx.textAlign='center';ctx.fillText(z.e,0,z.sz*0.42)
        if(z.maxHp>1){const bw=z.sz*2.6;ctx.fillStyle='#1F2937';ctx.fillRect(-bw/2,-z.sz-11,bw,5);ctx.fillStyle=z.hp/z.maxHp>0.5?'#10B981':'#EF4444';ctx.fillRect(-bw/2,-z.sz-11,bw*z.hp/z.maxHp,5)}
        ctx.restore()
      })

      s.eBullets.forEach(eb=>{ctx.fillStyle='#EF4444';ctx.beginPath();ctx.arc(eb.x,eb.y,5,0,Math.PI*2);ctx.fill()})

      // Player
      if(p.invT<=0||Math.floor(p.invT/8)%2===0){
        ctx.save();ctx.translate(p.x,p.y)
        // Shield ring
        if(s.shieldOn){
          ctx.beginPath();ctx.arc(0,0,26+Math.sin(s.frame*0.2)*2,0,Math.PI*2)
          ctx.strokeStyle='#60A5FA';ctx.lineWidth=3;ctx.globalAlpha=0.8;ctx.stroke();ctx.globalAlpha=1
        }
        ctx.fillStyle=s.instakillOn?'#FBBF24':'#FCD34D';ctx.shadowColor=s.instakillOn?'#FCD34D':'#FCD34D';ctx.shadowBlur=14
        ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0
        ctx.strokeStyle='#D97706';ctx.lineWidth=2.5;ctx.stroke()
        ctx.fillStyle='white';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,1);ctx.textBaseline='alphabetic'
        const ang=Math.atan2(mouseRef.current.y-p.y,mouseRef.current.x-p.x);ctx.rotate(ang)
        ctx.fillStyle=s.instakillOn?'#FCD34D':'#1F2937';ctx.fillRect(13,-3,14,6)
        ctx.restore()
      }

      s.bullets.forEach(b=>{
        ctx.fillStyle=s.instakillOn?'#FCD34D':'#93C5FD'
        ctx.shadowColor=s.instakillOn?'#FCD34D':'#93C5FD';ctx.shadowBlur=5
        ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0
      })
      s.floats.forEach(f=>{ctx.globalAlpha=f.life/45;ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillStyle=f.c;ctx.fillText(f.t,f.x,f.y);ctx.globalAlpha=1})

      // HUD bar
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(26,26,340,22)
      ctx.font='bold 11px system-ui';ctx.fillStyle='white';ctx.textAlign='left'
      ctx.fillText(`Wave ${s.wave}  |  Score: ${s.score}  |  Left: ${s.zombies.length}`,32,41)

      // Active power-up indicator
      if(s.puActive){
        const barW=160
        const ratio=s.puActiveTimer/360
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(RW-barW-14,30,barW+4,18)
        ctx.fillStyle=s.puActive==='shield'?'#60A5FA':'#FCD34D'
        ctx.fillRect(RW-barW-12,32,barW*ratio,14)
        ctx.font='bold 10px system-ui';ctx.textAlign='right';ctx.fillStyle='white'
        ctx.fillText(s.puActive==='shield'?'🛡️ SHIELD ACTIVE':'⚡ INSTA-KILL',RW-16,43)
      }

      if(p.stT>0){ctx.fillStyle='#FCD34D44';ctx.fillRect(0,0,RW,RH);ctx.font='bold 26px system-ui';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText('⚡ STUNNED!',RW/2,RH/2)}

      rafRef.current=requestAnimationFrame(loop)
    }
    loop()
  },[])

  const start=useCallback(()=>{
    const cv=cvRef.current; if(!cv) return
    const ctx=cv.getContext('2d')
    stRef.current=makeWave(1,0,3)
    setUi({score:0,wave:1,lives:3,over:false,between:false})
    const kd=e=>{keysRef.current[e.key]=true}
    const ku=e=>{keysRef.current[e.key]=false}
    const mm=e=>{const r=cv.getBoundingClientRect();mouseRef.current={x:(e.clientX-r.left)*(RW/r.width),y:(e.clientY-r.top)*(RH/r.height)}}
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);cv.addEventListener('mousemove',mm)
    runLoop(ctx)
    return()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);cv.removeEventListener('mousemove',mm);cancelAnimationFrame(rafRef.current)}
  },[makeWave,runLoop])

  useEffect(()=>{const c=start();return()=>{c?.();cancelAnimationFrame(rafRef.current)}},[start])

  const nextWave=useCallback(()=>{
    const cv=cvRef.current; if(!cv) return
    const ctx=cv.getContext('2d'),s=stRef.current; if(!s) return
    cancelAnimationFrame(rafRef.current)
    stRef.current=makeWave(s.wave+1,s.score,s.lives)
    setUi({score:stRef.current.score,wave:stRef.current.wave,lives:stRef.current.lives,over:false,between:false})
    runLoop(ctx)
  },[makeWave,runLoop])

  return(
    <Shell title="Money Defender" emoji="💼" onClose={onClose} score={ui.score} hs={hs} lives={ui.lives} extra={<span style={{fontSize:11,color:'#A78BFA'}}>Wave {ui.wave}</span>}>
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0A1628'}}>
        <canvas ref={cvRef} width={RW} height={RH} style={{maxWidth:'100%',maxHeight:'100%',cursor:'crosshair'}}/>
        {ui.between&&!ui.over&&(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#1E293B',borderRadius:20,padding:'28px 36px',textAlign:'center',border:'2px solid #334155'}}>
              <div style={{fontSize:40,marginBottom:8}}>🏆</div>
              <div style={{fontSize:18,fontWeight:700,color:'#10B981',marginBottom:4}}>Wave {ui.wave} Clear!</div>
              <div style={{fontSize:14,color:'#94A3B8',marginBottom:12}}>Score: {ui.score}</div>
              <div style={{fontSize:12,color:'#64748B',marginBottom:6}}>{WAVES[Math.min(ui.wave,WAVES.length-1)].n} zombies — {WAVES[Math.min(ui.wave,WAVES.length-1)].types.length} types</div>
              {ui.wave>=3&&<div style={{fontSize:11,color:'#FCD34D',marginBottom:16}}>🛡️ Shield & ⚡ Insta-Kill drop randomly on the floor!</div>}
              <button onClick={nextWave} style={{padding:'10px 28px',background:'#7C3AED',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer'}}>Next Wave ▶</button>
            </div>
          </div>
        )}
        {ui.over&&<Over score={ui.score} hs={hs} onRestart={()=>{cancelAnimationFrame(rafRef.current);start()}} onExit={onClose} msg={`Survived ${ui.wave} waves!`}/>}
      </div>
      <div style={{padding:'5px',background:'#0A1628',fontSize:11,color:'#475569',textAlign:'center'}}>WASD/Arrows to move — mouse aims — auto-shoots! Pick up 🛡️⚡ from the floor at Wave 3+</div>
    </Shell>
  )
}

// GAME 7 — INVESTMENT MEMORY
// ═══════════════════════════════════════════════════════════
function InvestmentMemory({ onClose }) {
  const [gs,setGs]=useState({phase:'idle'})
  const [hs,setHs]=useState(getHS('memory'))

  const PAIRS=[
    {id:'re',    e:'🏠', name:'Real Estate',  tip:'Property values double every ~10 years on average.'},
    {id:'stock', e:'📈', name:'Stocks',        tip:'S&P 500 returns 10% per year on average over 100 years.'},
    {id:'gold',  e:'🥇', name:'Gold',          tip:'Gold hedges against inflation and market crashes.'},
    {id:'biz',   e:'🏪', name:'Business',      tip:'65% of millionaires own or owned a small business.'},
    {id:'etf',   e:'💼', name:'ETF Fund',      tip:'ETFs spread risk — Buffett recommends them for most people.'},
    {id:'edu',   e:'🎓', name:'Education',     tip:'A new skill raises your lifetime earnings permanently.'},
    {id:'bond',  e:'📄', name:'Bonds',         tip:'Bonds are lower risk than stocks — good for stability.'},
    {id:'crypto',e:'🪙', name:'Crypto',        tip:'High risk high reward. Never invest more than you can lose.'},
  ]

  const startGame=(pairs=4)=>{
    const selected=PAIRS.slice(0,pairs)
    const cards=[...selected,...selected].map((p,i)=>({...p,idx:i,flipped:false,matched:false}))
    const shuffled=cards.sort(()=>Math.random()-0.5)
    setGs({phase:'playing',cards:shuffled,first:null,second:null,score:0,pairs,moves:0,tip:'',tipName:'',locked:false,won:false})
  }
  const flip=(idx)=>{
    setGs(s=>{
      if(s.locked||s.cards[idx].flipped||s.cards[idx].matched) return s
      const cards=[...s.cards]
      cards[idx]={...cards[idx],flipped:true}
      if(s.first===null) return {...s,cards,first:idx}
      const f=s.first, sec=idx
      const moves=s.moves+1
      if(cards[f].id===cards[sec].id){
        cards[f]={...cards[f],matched:true}
        cards[sec]={...cards[sec],matched:true}
        const matched=cards.filter(c=>c.matched).length/2
        const tip=cards[f].tip, tipName=cards[f].name
        if(matched>=s.pairs){
          const sc=s.score+20
          saveHS('memory',sc); setHs(getHS('memory'))
          return{...s,cards,first:null,second:null,moves,score:sc,tip,tipName,won:true}
        }
        return{...s,cards,first:null,second:null,moves,score:s.score+20,tip,tipName}
      } else {
        setTimeout(()=>setGs(g=>({...g,cards:g.cards.map((c,i)=>i===f||i===sec?{...c,flipped:false}:c),first:null,second:null,locked:false})),900)
        return{...s,cards,first:null,second:sec,locked:true}
      }
    })
  }

  const card=gs.cards?.[gs.first]
  return(
    <Shell title="Investment Memory" emoji="🃏" onClose={onClose} score={gs.score||0} hs={hs}>
      <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,background:'linear-gradient(135deg,#0f172a,#1e293b)',gap:12}}>
        {gs.phase==='idle'&&(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:56,marginBottom:10}}>🃏</div>
            <div style={{fontSize:20,fontWeight:700,color:'white',marginBottom:8}}>Investment Memory</div>
            <div style={{fontSize:13,color:'#94A3B8',marginBottom:20,maxWidth:300,lineHeight:1.6}}>Flip cards to find matching investment pairs. Each match reveals a financial tip!</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>startGame(4)} style={{padding:'9px 20px',background:'#10B981',color:'white',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>Easy (4 pairs)</button>
              <button onClick={()=>startGame(6)} style={{padding:'9px 20px',background:'#F59E0B',color:'white',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>Medium (6)</button>
              <button onClick={()=>startGame(8)} style={{padding:'9px 20px',background:'#EF4444',color:'white',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>Hard (8)</button>
            </div>
          </div>
        )}
        {gs.phase==='playing'&&(
          <>
            <div style={{display:'flex',gap:20,marginBottom:4}}>
              <span style={{fontSize:12,color:'#94A3B8'}}>Moves: {gs.moves}</span>
              <span style={{fontSize:12,color:'#FCD34D'}}>Score: {gs.score}</span>
              <span style={{fontSize:12,color:'#94A3B8'}}>Best: {hs}</span>
            </div>
            {gs.tip&&(
              <div style={{background:'#1E3A5F',borderRadius:10,padding:'8px 14px',maxWidth:420,textAlign:'center',borderLeft:'3px solid #3B82F6'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#60A5FA',marginBottom:2}}>💡 {gs.tipName}</div>
                <div style={{fontSize:11,color:'#CBD5E1'}}>{gs.tip}</div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:`repeat(${gs.pairs<=4?4:gs.pairs<=6?4:4},1fr)`,gap:8,maxWidth:420}}>
              {gs.cards.map((c,i)=>(
                <div key={i} onClick={()=>flip(i)} style={{
                  width:80,height:90,borderRadius:12,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,
                  background:c.matched?'#064E3B':c.flipped?'#1E3A5F':'linear-gradient(135deg,#334155,#1E293B)',
                  border:`2px solid ${c.matched?'#10B981':c.flipped?'#3B82F6':'#475569'}`,
                  transform:c.flipped||c.matched?'rotateY(0)':'rotateY(180deg)',
                  transition:'all 0.3s',
                  boxShadow:c.matched?'0 0 12px #10B98144':'none'
                }}>
                  {(c.flipped||c.matched)?(
                    <>
                      <span style={{fontSize:32}}>{c.e}</span>
                      <span style={{fontSize:9,color:'#94A3B8',textAlign:'center',lineHeight:1.2}}>{c.name}</span>
                    </>
                  ):(
                    <span style={{fontSize:28,color:'#475569'}}>?</span>
                  )}
                </div>
              ))}
            </div>
            {gs.won&&(
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:700,color:'#FCD34D',marginBottom:8}}>🏆 All matched! Score: {gs.score}</div>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={()=>startGame(gs.pairs)} style={{padding:'8px 18px',background:'#7C3AED',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700}}>Play Again</button>
                  <button onClick={()=>setGs({phase:'idle'})} style={{padding:'8px 18px',background:'#334155',color:'white',border:'none',borderRadius:9,cursor:'pointer'}}>Menu</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// GAME 8 — STACK THE SAVINGS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
function BudgetBalance({ onClose }) {
  const [gs, setGs] = useState({ phase:'idle' })
  const [hs, setHs] = useState(getHS('balance'))
  const timerRef = useRef(null)

  const INCOME_CARDS = [
    {e:'💼',label:'Salary',     value:3000},
    {e:'🏘️',label:'Rent income',value:800},
    {e:'📈',label:'Dividends',  value:400},
    {e:'💻',label:'Freelance',  value:600},
    {e:'🎁',label:'Bonus',      value:500},
  ]
  const EXPENSE_CARDS = [
    {e:'🏠',label:'Mortgage',  value:1200},
    {e:'🍕',label:'Food',      value:400},
    {e:'🚗',label:'Car loan',  value:350},
    {e:'📱',label:'Subscriptions',value:80},
    {e:'🎰',label:'Gambling',  value:500},
    {e:'☕',label:'Daily latte',value:200},
    {e:'👟',label:'Shopping',  value:300},
    {e:'🏥',label:'Medical',   value:250},
  ]

  const makeRound=(level)=>{
    const inc=[...INCOME_CARDS].sort(()=>Math.random()-0.5).slice(0,2+Math.floor(level/2))
    const exp=[...EXPENSE_CARDS].sort(()=>Math.random()-0.5).slice(0,3+level)
    const allCards=[...inc.map(c=>({...c,side:'income'})),...exp.map(c=>({...c,side:'expense'}))]
    const shuffled=allCards.sort(()=>Math.random()-0.5)
    const totalInc=inc.reduce((s,c)=>s+c.value,0)
    const totalExp=exp.reduce((s,c)=>s+c.value,0)
    return {cards:shuffled.map((c,i)=>({...c,id:i,placed:null})), totalInc, totalExp, timeLeft:100}
  }

  const startGame=()=>{
    const r=makeRound(1)
    setGs({phase:'playing',score:0,level:1,round:r,dragging:null,incomeSlot:[],expenseSlot:[],result:null})
  }

  const dropCard=(cardId,side)=>{
    setGs(s=>{
      if(s.result) return s
      const cards=s.round.cards.map(c=>c.id===cardId?{...c,placed:side}:c)
      const placed=cards.filter(c=>c.placed!==null)
      if(placed.length<cards.length) return {...s,round:{...s.round,cards}}
      // All placed — score
      let correct=0
      cards.forEach(c=>{if(c.placed===c.side)correct++})
      const pts=Math.round((correct/cards.length)*100)
      const score=s.score+pts
      const won=correct===cards.length
      if(won){saveHS('balance',score);setHs(getHS('balance'))}
      return {...s,round:{...s.round,cards},score,result:{correct,total:cards.length,pts,won}}
    })
  }

  const nextRound=()=>{
    setGs(s=>{
      const level=s.level+1
      const r=makeRound(level)
      return{...s,level,round:r,result:null}
    })
  }

  const r=gs.round
  const incomeCards=r?.cards.filter(c=>c.placed==='income')||[]
  const expenseCards=r?.cards.filter(c=>c.placed==='expense')||[]
  const unplaced=r?.cards.filter(c=>c.placed===null)||[]
  const incTotal=incomeCards.reduce((s,c)=>s+c.value,0)
  const expTotal=expenseCards.reduce((s,c)=>s+c.value,0)
  const tilt=Math.min(20,Math.max(-20,(expTotal-incTotal)/200))

  return(
    <Shell title="Budget Balance" emoji="⚖️" onClose={onClose} score={gs.score||0} hs={hs}>
      <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:12,background:'linear-gradient(135deg,#0f172a,#1a2744)'}}>
        {gs.phase==='idle'&&(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:56,marginBottom:10}}>⚖️</div>
            <div style={{fontSize:20,fontWeight:700,color:'white',marginBottom:8}}>Budget Balance</div>
            <div style={{fontSize:13,color:'#94A3B8',marginBottom:20,maxWidth:300,lineHeight:1.6}}>Drag each card to the correct side — Income or Expense. Balance your budget to win!</div>
            <button onClick={startGame} style={{padding:'11px 32px',background:'#7C3AED',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}}>Start!</button>
          </div>
        )}
        {gs.phase==='playing'&&r&&(
          <>
            <div style={{display:'flex',gap:16,alignItems:'center',fontSize:12,color:'#94A3B8'}}>
              <span>Level {gs.level}</span><span style={{color:'#FCD34D'}}>Score: {gs.score}</span><span>Best: {hs}</span>
            </div>
            {/* Scale visual */}
            <div style={{position:'relative',width:300,height:60,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{position:'absolute',width:2,height:50,background:'#64748B',top:5,left:'50%'}}/>
              <div style={{position:'absolute',width:200,height:3,background:'#94A3B8',transform:`rotate(${tilt}deg)`,top:10,transformOrigin:'center'}}/>
              <div style={{position:'absolute',left:'calc(50% - 100px)',top:14,transform:`rotate(${tilt}deg)`,transformOrigin:'100px 0',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{width:60,height:28,background:'#22C55E44',border:'2px solid #22C55E',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#22C55E',fontWeight:700}}>${incTotal}</div>
              </div>
              <div style={{position:'absolute',right:'calc(50% - 100px)',top:14,transform:`rotate(${tilt}deg)`,transformOrigin:'-100px 0',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{width:60,height:28,background:'#EF444444',border:'2px solid #EF4444',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#EF4444',fontWeight:700}}>${expTotal}</div>
              </div>
            </div>
            {/* Drop zones */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%',maxWidth:420}}>
              {[{side:'income',label:'💰 Income',color:'#22C55E',cards:incomeCards},{side:'expense',label:'💸 Expense',color:'#EF4444',cards:expenseCards}].map(zone=>(
                <div key={zone.side} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=parseInt(e.dataTransfer.getData('text'));dropCard(id,zone.side)}}
                  style={{minHeight:90,background:zone.color+'11',border:`2px dashed ${zone.color}66`,borderRadius:10,padding:6,display:'flex',flexDirection:'column',gap:4}}>
                  <div style={{fontSize:11,fontWeight:700,color:zone.color,marginBottom:2}}>{zone.label}</div>
                  {zone.cards.map(c=>(
                    <div key={c.id} style={{background:zone.color+'22',borderRadius:7,padding:'3px 7px',fontSize:11,color:'white',display:'flex',justifyContent:'space-between'}}>
                      <span>{c.e} {c.label}</span><span style={{color:zone.color,fontWeight:700}}>${c.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Unplaced cards */}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',maxWidth:420}}>
              {unplaced.map(c=>(
                <div key={c.id} draggable onDragStart={e=>{e.dataTransfer.setData('text',c.id.toString())}}
                  style={{background:'#1E293B',border:'1.5px solid #334155',borderRadius:9,padding:'5px 10px',cursor:'grab',display:'flex',gap:6,alignItems:'center',fontSize:12,color:'white',userSelect:'none'}}>
                  <span style={{fontSize:18}}>{c.e}</span>
                  <div><div style={{fontSize:11,fontWeight:600}}>{c.label}</div><div style={{fontSize:10,color:'#94A3B8'}}>${c.value}</div></div>
                </div>
              ))}
            </div>
            {gs.result&&(
              <div style={{textAlign:'center',background:'#1E293B',borderRadius:14,padding:'12px 20px',border:'1.5px solid #334155'}}>
                <div style={{fontSize:15,fontWeight:700,color:gs.result.won?'#10B981':'#F59E0B',marginBottom:6}}>
                  {gs.result.won?'✅ Perfect budget!':'⚠️ '+gs.result.correct+'/'+gs.result.total+' correct'} +{gs.result.pts}pts
                </div>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={nextRound} style={{padding:'7px 18px',background:'#7C3AED',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700}}>Next Round</button>
                  <button onClick={()=>setGs({phase:'idle'})} style={{padding:'7px 18px',background:'#334155',color:'white',border:'none',borderRadius:9,cursor:'pointer'}}>Exit</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════
// HUB — 7 games
// ═══════════════════════════════════════════════════════════
const GAMES=[
  {id:'rain',    name:'Money Rain',       emoji:'💰',desc:'Catch money bags — dodge tax bombs!',         color:'#FCD34D',bg:'linear-gradient(135deg,#451A03,#78350F)',Comp:MoneyRain},
  {id:'runner',  name:'Expense Runner',   emoji:'🏃',desc:'Jump over expenses as a spinning coin!',      color:'#10B981',bg:'linear-gradient(135deg,#022C22,#064E3B)',Comp:ExpenseRunner},
  {id:'stocks',  name:'Stock Clicker',    emoji:'📈',desc:'Act in the window — buy low sell high fast!', color:'#3B82F6',bg:'linear-gradient(135deg,#0C2340,#1E40AF44)',Comp:StockClicker},
  {id:'reflex',  name:'Good or Bad?',     emoji:'⚡',desc:'Is this expense good or bad for you?',        color:'#F59E0B',bg:'linear-gradient(135deg,#451A03,#7C2D12)',Comp:BudgetReflex},
  {id:'defender',name:'Money Defender',   emoji:'💼',desc:'Survive zombie expense waves!',               color:'#EF4444',bg:'linear-gradient(135deg,#1F0A0A,#450A0A)',Comp:MoneyDefender},
  {id:'memory',  name:'Investment Memory',emoji:'🃏',desc:'Match investment pairs — learn financial tips!',color:'#A78BFA',bg:'linear-gradient(135deg,#1E0A3C,#2E1065)',Comp:InvestmentMemory},
  {id:'balance', name:'Budget Balance',   emoji:'⚖️',desc:'Drag income & expense cards to the right side!',color:'#34D399',bg:'linear-gradient(135deg,#022C1A,#064E3B)',Comp:BudgetBalance},
]

export default function MiniGames(){
  const [active,setActive]=useState(null)
  const G=active?GAMES.find(g=>g.id===active):null
  if(G) return <G.Comp onClose={()=>setActive(null)}/>
  return(
    <div style={{padding:'24px 20px',fontFamily:'system-ui'}}>
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--color-text-primary)',marginBottom:4}}>Mini Games 🎮</h1>
        <p style={{fontSize:13,color:'var(--color-text-secondary)'}}>7 games — learn financial skills while having fun!</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {GAMES.map(g=>{
          const score=getHS(g.id)
          return(
            <div key={g.id} onClick={()=>setActive(g.id)} style={{background:g.bg,border:`1.5px solid ${g.color}44`,borderRadius:18,padding:'18px 16px',cursor:'pointer',transition:'transform 0.15s, box-shadow 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)';e.currentTarget.style.boxShadow=`0 8px 28px ${g.color}44`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <span style={{fontSize:38}}>{g.emoji}</span>
                {score>0&&<span style={{fontSize:10,background:g.color+'33',color:g.color,border:`1px solid ${g.color}55`,borderRadius:8,padding:'2px 7px',fontWeight:700}}>Best: {score}</span>}
              </div>
              <div style={{fontSize:14,fontWeight:700,color:'white',marginBottom:4}}>{g.name}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',lineHeight:1.5,marginBottom:12}}>{g.desc}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:g.color,color:'#000',borderRadius:8,padding:'5px 14px',fontSize:12,fontWeight:700}}>▶ Play</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
