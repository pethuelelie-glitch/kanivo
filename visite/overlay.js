// Calque du guide injecté dans la page : curseur visible, bulle de narration,
// boutons de réponse et anneau de surbrillance. Piloté depuis guide.py via window.__kg.
(() => {
  if (window.__kg) return
  const kg = { answer: null, side: 'left', ring: null, target: null }
  window.__kg = kg

  const CSS = `
  #kg-panel{position:fixed;bottom:20px;left:20px;z-index:2147483646;width:min(410px,calc(100vw - 40px));
    background:rgba(5,18,28,.95);color:#e9f2f6;border:1px solid rgba(255,255,255,.14);border-radius:16px;
    box-shadow:0 18px 50px rgba(0,0,0,.5);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:16px 18px 14px;backdrop-filter:blur(8px);transition:left .4s ease,right .4s ease,opacity .3s}
  #kg-panel.kg-right{left:auto;right:20px}
  #kg-panel .kg-top{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7fd3ff}
  #kg-panel .kg-top b{flex:1}
  #kg-panel .kg-dock{all:unset;cursor:pointer;padding:2px 8px;border-radius:6px;color:#9fb3bf}
  #kg-panel .kg-dock:hover{background:rgba(255,255,255,.08)}
  #kg-panel h4{margin:8px 0 4px;font-size:18px;line-height:1.3;color:#fff}
  #kg-panel p{margin:0;color:#c9d8e0}
  #kg-panel p b{color:#ffc54d}
  #kg-panel .kg-hint{margin-top:8px;color:#ffc54d;font-size:14px}
  #kg-panel .kg-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  #kg-panel .kg-btns:empty{display:none}
  #kg-panel .kg-btn{all:unset;cursor:pointer;padding:7px 13px;border-radius:999px;font-size:14px;
    background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#e9f2f6}
  #kg-panel .kg-btn:hover{background:rgba(255,255,255,.16)}
  #kg-panel .kg-btn--main{background:#1fa3ff;border-color:#1fa3ff;color:#04111a;font-weight:600}
  #kg-panel .kg-btn.is-good{background:#22c08a;border-color:#22c08a;color:#04111a}
  #kg-panel .kg-btn.is-bad{background:#ff5a52;border-color:#ff5a52;color:#04111a}
  #kg-panel .kg-bar{height:3px;margin-top:12px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
  #kg-panel .kg-bar span{display:block;height:100%;width:0;background:#1fa3ff;transition:width .5s}
  #kg-cursor{position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;width:26px;height:26px;
    margin:-3px 0 0 -3px;transition:opacity .3s;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}
  #kg-cursor.is-off{opacity:0}
  .kg-ripple{position:fixed;z-index:2147483646;pointer-events:none;width:36px;height:36px;margin:-18px 0 0 -18px;
    border-radius:50%;border:2px solid #ffc54d;animation:kg-rip .55s ease-out forwards}
  @keyframes kg-rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
  #kg-ring{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid #ffc54d;border-radius:12px;
    box-shadow:0 0 0 6px rgba(255,197,77,.18);animation:kg-pulse 1.1s ease-in-out infinite;display:none}
  @keyframes kg-pulse{50%{box-shadow:0 0 0 14px rgba(255,197,77,0)}}
  #kg-checks{position:fixed;top:84px;right:20px;z-index:2147483646;width:290px;max-height:calc(100vh - 120px);overflow:auto;
    background:rgba(5,18,28,.93);color:#e9f2f6;border:1px solid rgba(255,255,255,.14);border-radius:14px;
    box-shadow:0 18px 50px rgba(0,0,0,.45);font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;padding:12px 14px;
    transition:opacity .3s}
  #kg-checks[hidden]{display:none}
  #kg-checks.kg-ghost{opacity:.12;pointer-events:none}
  #kg-checks h5{margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7fd3ff;display:flex;justify-content:space-between}
  #kg-checks ol{margin:0;padding:0;list-style:none;display:grid;gap:5px}
  #kg-checks li{display:grid;grid-template-columns:18px 1fr;gap:6px;color:#c9d8e0}
  #kg-checks li i{font-style:normal}
  #kg-checks li.run i{animation:kg-spin 1s linear infinite;display:inline-block}
  #kg-checks li.ko{color:#ff8f88}
  @keyframes kg-spin{to{transform:rotate(360deg)}}
  #kg-intro{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;text-align:center;
    background:radial-gradient(circle at 50% 40%,rgba(10,40,60,.96),rgba(2,8,14,.98));color:#fff;
    font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;transition:opacity .8s}
  #kg-intro.is-out{opacity:0;pointer-events:none}
  #kg-intro small{display:block;letter-spacing:.2em;text-transform:uppercase;color:#7fd3ff;font-size:13px}
  #kg-intro h1{margin:14px 0 10px;font-size:clamp(32px,5vw,64px);line-height:1.1}
  #kg-intro p{margin:0 auto;max-width:640px;color:#c9d8e0;font-size:18px}
  #kg-intro b{display:block;margin-top:28px;font-size:72px;color:#ffc54d;font-variant-numeric:tabular-nums}`

  let panel, cursor, ring, checks
  window.__kgReal = null
  document.addEventListener('mousemove', (e) => { window.__kgReal = { x: e.clientX, y: e.clientY, t: performance.now() } }, true)
  function build() {
    if (document.getElementById('kg-panel')) return
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.append(style)

    panel = document.createElement('aside')
    panel.id = 'kg-panel'
    panel.setAttribute('aria-live', 'polite')
    panel.innerHTML = `<div class="kg-top"><span aria-hidden="true">●</span><b data-k>Guide Kanivo</b>
      <button class="kg-dock" type="button" title="Déplacer la bulle">⇆</button></div>
      <h4 data-t></h4><p data-x></p><p class="kg-hint" data-h hidden></p>
      <div class="kg-btns" data-b></div><div class="kg-bar"><span data-p></span></div>`
    panel.querySelector('.kg-dock').addEventListener('click', (e) => {
      e.stopPropagation()
      kg.dock(kg.side === 'left' ? 'right' : 'left')
    })
    document.body.append(panel)

    cursor = document.createElement('div')
    cursor.id = 'kg-cursor'
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11.5-6.6.9 3.9 7.4-2.9 1.5-3.9-7.5L4 20z" fill="#fff" stroke="#04111a" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    cursor.style.transform = 'translate(-60px,-60px)'
    document.body.append(cursor)

    ring = document.createElement('div')
    ring.id = 'kg-ring'
    document.body.append(ring)

    checks = document.createElement('aside')
    checks.id = 'kg-checks'
    checks.hidden = true
    checks.innerHTML = '<h5><span>Recette en direct</span><span data-score></span></h5><ol></ol>'
    document.body.append(checks)

    document.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
    }, true)
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('span')
      r.className = 'kg-ripple'
      r.style.left = e.clientX + 'px'
      r.style.top = e.clientY + 'px'
      document.body.append(r)
      setTimeout(() => r.remove(), 600)
    }, true)

    const follow = () => {
      if (kg.target) {
        const el = document.querySelector(kg.target)
        if (el) {
          const b = el.getBoundingClientRect()
          Object.assign(ring.style, { display: 'block', left: b.left - 8 + 'px', top: b.top - 8 + 'px', width: b.width + 16 + 'px', height: b.height + 16 + 'px' })
        }
      } else ring.style.display = 'none'
      requestAnimationFrame(follow)
    }
    follow()
  }

  kg.say = ({ kicker = 'Guide Kanivo', title = '', text = '', hint = '', progress = null, buttons = [] } = {}) => {
    build()
    panel.querySelector('[data-k]').textContent = kicker
    panel.querySelector('[data-t]').textContent = title
    panel.querySelector('[data-x]').innerHTML = text
    const h = panel.querySelector('[data-h]')
    h.hidden = !hint
    h.innerHTML = hint
    if (progress !== null) panel.querySelector('[data-p]').style.width = Math.round(progress * 100) + '%'
    kg.buttons(buttons)
  }

  kg.hint = (html) => {
    const h = panel.querySelector('[data-h]')
    h.hidden = !html
    h.innerHTML = html
  }

  kg.buttons = (list) => {
    const box = panel.querySelector('[data-b]')
    box.innerHTML = ''
    kg.answer = null
    for (const b of list) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'kg-btn' + (b.main ? ' kg-btn--main' : '')
      el.textContent = b.label
      el.dataset.value = b.value
      el.addEventListener('click', (e) => { e.stopPropagation(); kg.answer = b.value })
      box.append(el)
    }
  }

  kg.mark = (chosen, good) => {
    panel.querySelectorAll('.kg-btn').forEach((el) => {
      if (el.dataset.value === good) el.classList.add('is-good')
      else if (el.dataset.value === chosen) el.classList.add('is-bad')
      el.disabled = true
      el.style.pointerEvents = 'none'
    })
  }


  // Liste des tests : état 'run' (en cours), 'ok' ou 'ko'.
  kg.check = (id, label, state) => {
    build()
    checks.hidden = false
    let li = checks.querySelector(`[data-id="${id}"]`)
    if (!li) {
      li = document.createElement('li')
      li.dataset.id = id
      li.innerHTML = '<i></i><span></span>'
      checks.querySelector('ol').append(li)
    }
    li.className = state
    li.querySelector('i').textContent = { run: '◌', ok: '✅', ko: '❌' }[state]
    li.querySelector('span').textContent = label
    li.scrollIntoView({ block: 'nearest' })
    const all = checks.querySelectorAll('li')
    const ok = checks.querySelectorAll('li.ok').length
    checks.querySelector('[data-score]').textContent = `${ok}/${all.length}`
  }
  kg.checksVisible = (on) => { build(); checks.hidden = !on }

  kg.intro = (kicker, title, text) => {
    build()
    let el = document.getElementById('kg-intro')
    if (!el) { el = document.createElement('div'); el.id = 'kg-intro'; document.body.append(el) }
    el.classList.remove('is-out')
    el.innerHTML = `<div><small>${kicker}</small><h1>${title}</h1><p>${text}</p><b data-c></b></div>`
  }
  kg.count = (n) => { const c = document.querySelector('#kg-intro [data-c]'); if (c) c.textContent = n }
  kg.introHide = () => { const el = document.getElementById('kg-intro'); if (el) el.classList.add('is-out') }

  // Voix du navigateur : phrases découpées (Chrome coupe les longues lectures), file d'attente suivie.
  kg.queue = 0
  kg.voices = () => ('speechSynthesis' in window ? speechSynthesis.getVoices() : [])
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr')).map((v) => v.name)
  kg.speak = (text, name) => {
    if (!('speechSynthesis' in window)) return
    const voice = speechSynthesis.getVoices().find((v) => v.name === name)
    for (const part of text.match(/[^.!?;:]+[.!?;:]*/g) || [text]) {
      if (!part.trim()) continue
      const u = new SpeechSynthesisUtterance(part.trim())
      u.lang = voice ? voice.lang : 'fr-FR'
      if (voice) u.voice = voice
      u.rate = 1.02
      kg.queue++
      u.onend = u.onerror = () => { kg.queue = Math.max(0, kg.queue - 1) }
      speechSynthesis.speak(u)
    }
  }
  kg.speaking = () => kg.queue > 0 || ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending))
  kg.hush = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); kg.queue = 0 }

  kg.take = () => { const a = kg.answer; kg.answer = null; return a }
  kg.highlight = (sel) => { kg.target = sel || null }
  kg.cursor = (on) => { build(); cursor.classList.toggle('is-off', !on) }
  kg.dock = (side) => { kg.side = side; panel.classList.toggle('kg-right', side === 'right') }
  // Déplace la bulle si elle couvre le point que le guide s'apprête à viser.
  kg.avoid = (x, y) => {
    if (!panel) return false
    const r = panel.getBoundingClientRect()
    if (x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24) {
      kg.dock(kg.side === 'left' ? 'right' : 'left')
      return true
    }
    if (checks && !checks.hidden) {
      const c = checks.getBoundingClientRect()
      const inside = x >= c.left - 24 && x <= c.right + 24 && y >= c.top - 24 && y <= c.bottom + 24
      checks.classList.toggle('kg-ghost', inside)
      if (inside) { clearTimeout(kg.ghostT); kg.ghostT = setTimeout(() => checks.classList.remove('kg-ghost'), 5000) }
    }
    return false
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build)
  else build()
})()
