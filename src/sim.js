import { COMMUNES } from './data.js'

const NS = 'http://www.w3.org/2000/svg'
const fmt = new Intl.NumberFormat('fr-FR')

// Modèle illustratif : aléa logistique sur la pluie « effective »,
// amplifiée par l'obstruction résiduelle des caniveaux.
export function riskFor(c, { rain, curage }) {
  const obstruction = c.obs * (1 - curage)
  const effective = rain * (1 + obstruction * 1.3)
  const hazard = 1 / (1 + Math.exp(-(effective - 150) / 32))
  return Math.min(1, hazard * (0.35 + c.vuln * 0.75))
}

// Part de la population vivant en bas-fond ou sur pente instable (hypothèse : 2 à 10 % selon la vulnérabilité).
const exposedShare = (c) => 0.02 + c.vuln * 0.08

export function level(r) {
  if (r >= 0.6) return { key: 'red', label: 'Rouge', color: 'var(--red)' }
  if (r >= 0.4) return { key: 'orange', label: 'Orange', color: 'var(--orange)' }
  if (r >= 0.2) return { key: 'yellow', label: 'Jaune', color: 'var(--amber)' }
  return { key: 'green', label: 'Vert', color: 'var(--green)' }
}

export function compute(state) {
  const rows = COMMUNES.map((c) => {
    const risk = riskFor(c, state)
    const exposed = Math.round(c.pop * exposedShare(c) * risk)
    return { c, risk, exposed, safe: Math.round(exposed * state.alerte * 0.85), lvl: level(risk) }
  })
  const exposed = rows.reduce((s, r) => s + r.exposed, 0)
  const safe = rows.reduce((s, r) => s + r.safe, 0)
  return {
    rows,
    exposed,
    safe,
    red: rows.filter((r) => r.lvl.key === 'red').length,
    sms: rows.filter((r) => r.risk >= 0.4).reduce((s, r) => s + r.exposed, 0),
  }
}

export function initSim(root, { gsap } = {}) {
  if (!root) return
  const $ = (s) => root.querySelector(s)
  const inputs = { rain: $('#rain'), curage: $('#curage'), alerte: $('#alerte') }
  const outs = { rain: $('[data-out="rain"]'), curage: $('[data-out="curage"]'), alerte: $('[data-out="alerte"]') }
  const kpi = (k) => $(`[data-kpi="${k}"]`)
  const layer = $('[data-communes]')
  const detail = $('[data-detail]')
  const list = $('[data-priority]')
  const modeBtns = [...root.querySelectorAll('[data-mode]')]
  const chips = [...root.querySelectorAll('[data-rain]')]
  const extraObs = Object.fromEntries(COMMUNES.map((c) => [c.id, 0]))
  let selected = null
  const shown = { exposed: 0, safe: 0, red: 0, sms: 0 }

  const nodes = new Map()
  for (const c of COMMUNES) {
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('class', 'commune')
    g.setAttribute('tabindex', '0')
    g.setAttribute('role', 'button')
    g.dataset.id = c.id
    const r = 9 + Math.sqrt(c.pop) / 70
    g.innerHTML = `
      <circle class="halo" cx="${c.x}" cy="${c.y}" r="${r * 2.6}" fill="url(#g-green)" />
      <circle class="pulse" cx="${c.x}" cy="${c.y}" r="14" />
      <circle class="core" cx="${c.x}" cy="${c.y}" r="${r}" />
      <text x="${c.x}" y="${c.y + r + 18}">${c.name}</text>
      <text class="score" x="${c.x}" y="${c.y + r + 32}"></text>`
    g.addEventListener('click', () => select(c.id))
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c.id) }
    })
    layer.append(g)
    nodes.set(c.id, g)
  }

  const state = () => ({
    rain: +inputs.rain.value,
    curage: +inputs.curage.value / 100,
    alerte: +inputs.alerte.value / 100,
  })

  function paintRange(el) {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100
    el.style.setProperty('--p', `${p}%`)
  }

  function tweenNumber(el, key, to) {
    if (!gsap) { el.textContent = fmt.format(to); shown[key] = to; return }
    const o = { v: shown[key] }
    gsap.to(o, {
      v: to, duration: 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => { el.textContent = fmt.format(Math.round(o.v)) },
    })
    shown[key] = to
  }

  function render() {
    const s = state()
    outs.rain.textContent = `${s.rain} mm`
    outs.curage.textContent = `${Math.round(s.curage * 100)} %`
    outs.alerte.textContent = `${Math.round(s.alerte * 100)} %`
    Object.values(inputs).forEach(paintRange)
    chips.forEach((c) => c.classList.toggle('is-on', +c.dataset.rain === s.rain))

    // Les signalements locaux ajoutent de l'obstruction à la commune concernée.
    const res = compute(s)
    res.rows.forEach((row) => {
      const bump = extraObs[row.c.id]
      if (bump) {
        const c = { ...row.c, obs: Math.min(1, row.c.obs + bump) }
        row.risk = riskFor(c, s)
        row.lvl = level(row.risk)
      }
    })

    for (const row of res.rows) {
      const g = nodes.get(row.c.id)
      g.style.color = row.lvl.color
      g.querySelector('.core').style.fill = row.lvl.color
      g.querySelector('.halo').setAttribute('fill', `url(#g-${row.lvl.key})`)
      g.querySelector('.halo').setAttribute('r', (9 + Math.sqrt(row.c.pop) / 70) * (1.6 + row.risk * 2.6))
      g.querySelector('.score').textContent = `${Math.round(row.risk * 100)}`
      g.classList.toggle('is-red', row.lvl.key === 'red')
      g.setAttribute('aria-label', `${row.c.name} : risque ${row.lvl.label.toLowerCase()}, ${Math.round(row.risk * 100)} sur 100`)
    }

    tweenNumber(kpi('exposed'), 'exposed', res.exposed)
    tweenNumber(kpi('safe'), 'safe', res.safe)
    tweenNumber(kpi('red'), 'red', res.red)
    tweenNumber(kpi('sms'), 'sms', res.sms)

    const top = [...res.rows].sort((a, b) => b.risk * Math.sqrt(b.c.pop) - a.risk * Math.sqrt(a.c.pop)).slice(0, 6)
    list.innerHTML = top
      .map((r) => `<li><span><i style="background:${r.lvl.color}"></i>${r.c.name}</span><em>${Math.round(r.risk * 100)}/100</em></li>`)
      .join('')

    if (selected) renderDetail(res.rows.find((r) => r.c.id === selected))
  }

  function renderDetail(row) {
    if (!row) return
    detail.innerHTML = `
      <h4>${row.c.name}</h4>
      <dl>
        <dt>Niveau</dt><dd style="color:${row.lvl.color}">${row.lvl.label}</dd>
        <dt>Score</dt><dd>${Math.round(row.risk * 100)}/100</dd>
        <dt>Population (2021)</dt><dd>${fmt.format(row.c.pop)}</dd>
        <dt>Habitants exposés</dt><dd>${fmt.format(row.exposed)}</dd>
        <dt>Mis à l'abri</dt><dd>${fmt.format(row.safe)}</dd>
      </dl>`
  }

  function select(id) {
    selected = id
    nodes.forEach((g, k) => g.classList.toggle('is-selected', k === id))
    render()
  }

  function setMode(mode) {
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)))
    const target = mode === 'avec' ? { curage: 80, alerte: 75 } : { curage: 15, alerte: 20 }
    if (!gsap) { inputs.curage.value = target.curage; inputs.alerte.value = target.alerte; render(); return }
    const o = { curage: +inputs.curage.value, alerte: +inputs.alerte.value }
    gsap.to(o, {
      ...target, duration: 1.1, ease: 'power3.inOut',
      onUpdate: () => {
        inputs.curage.value = Math.round(o.curage / 5) * 5
        inputs.alerte.value = Math.round(o.alerte / 5) * 5
        render()
      },
    })
  }

  Object.values(inputs).forEach((el) => el.addEventListener('input', render))
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)))
  chips.forEach((c) => c.addEventListener('click', () => {
    if (!gsap) { inputs.rain.value = c.dataset.rain; render(); return }
    const o = { v: +inputs.rain.value }
    gsap.to(o, { v: +c.dataset.rain, duration: 0.9, ease: 'power3.inOut', onUpdate: () => { inputs.rain.value = Math.round(o.v / 5) * 5; render() } })
  }))

  // Module Signal (local)
  const form = document.querySelector('[data-report]')
  const sel = form?.querySelector('[data-r-commune]')
  if (form && sel) {
    sel.innerHTML = COMMUNES.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')
    sel.value = 'attecoube'
    let count = 2417
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const id = sel.value
      const lvl = +form.querySelector('#r-level').value
      extraObs[id] = Math.min(0.5, extraObs[id] + lvl * 0.12)
      count += 1
      const c = COMMUNES.find((x) => x.id === id)
      form.querySelector('[data-r-msg]').textContent = `Signalement n° ${fmt.format(count)} reçu à ${c.name}. Obstruction estimée : ${Math.round(lvl * 100)} %. Le risque de la commune est recalculé sur la carte.`
      select(id)
      const g = nodes.get(id)
      if (gsap) gsap.fromTo(g.querySelector('.core'), { scale: 1.6, transformOrigin: 'center' }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)', transformBox: 'fill-box' })
    })
  }

  render()
}
