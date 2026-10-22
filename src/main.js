import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/inter/index.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './style.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initSim } from './sim.js'

gsap.registerPlugin(ScrollTrigger)
document.documentElement.classList.add('js')

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

/* ---------- Défilement fluide ---------- */
let lenis = null
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')
    const el = id.length > 1 ? $(id) : null
    if (!el && id !== '#top') return
    e.preventDefault()
    const target = id === '#top' ? 0 : el
    if (lenis) lenis.scrollTo(target, { offset: -64, duration: 1.4 })
    else (el || document.body).scrollIntoView()
    if (el) el.setAttribute('tabindex', '-1'), el.focus({ preventScroll: true })
  })
})

/* ---------- Pluie (canvas) ---------- */
function rain(canvas) {
  const ctx = canvas.getContext('2d')
  let w, h, drops, splashes, raf, visible = true, started = false, intensity = 1
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const n = Math.round(Math.min(420, (w * h) / 4200))
    drops = Array.from({ length: n }, () => spawn(true))
    splashes = []
  }
  function spawn(anywhere) {
    const z = Math.random()
    return { x: Math.random() * (w + 200) - 100, y: anywhere ? Math.random() * h : -20, z, len: 10 + z * 26, v: 8 + z * 16 }
  }
  function frame() {
    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'
    for (const d of drops) {
      d.y += d.v * intensity; d.x -= d.v * 0.18 * intensity
      ctx.strokeStyle = `rgba(160, 230, 228, ${0.08 + d.z * 0.32})`
      ctx.lineWidth = 0.6 + d.z * 1.1
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.len * 0.18, d.y - d.len); ctx.stroke()
      if (d.y > h * (0.82 + d.z * 0.16)) {
        if (d.z > 0.6 && splashes.length < 60) splashes.push({ x: d.x, y: d.y, r: 0, a: 0.5 })
        Object.assign(d, spawn(false))
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.r += 0.8; s.a -= 0.025
      ctx.strokeStyle = `rgba(160, 230, 228, ${s.a})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2, s.r * 0.5, 0, 0, Math.PI * 2); ctx.stroke()
      if (s.a <= 0) splashes.splice(i, 1)
    }
    raf = visible ? requestAnimationFrame(frame) : null
  }
  resize()
  let lastW = w
  window.addEventListener('resize', () => { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; resize() } }, { passive: true })
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible && started && !raf) raf = requestAnimationFrame(frame)
  }).observe(canvas)
  if (reduced) { intensity = 0; frame(); visible = false; return { set() {} } }
  // Démarrage après le premier rendu pour ne pas bloquer le fil principal au chargement
  const start = () => { started = true; if (visible && !raf) raf = requestAnimationFrame(frame) }
  'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 300)
  return { set: (v) => { intensity = v } }
}
const rainFx = rain($('[data-rain]'))

/* ---------- Découpage en mots ---------- */
function splitWords(el) {
  const walk = (node) => {
    ;[...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment()
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return
          if (/^\s+$/.test(part)) return frag.append(' ')
          const w = document.createElement('span'); w.className = 'w'
          const i = document.createElement('span'); i.textContent = part
          w.append(i); frag.append(w)
        })
        n.replaceWith(frag)
      } else if (n.nodeType === 1) walk(n)
    })
  }
  el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '))
  walk(el)
  $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'))
}
$$('[data-split]').forEach(splitWords)

/* ---------- Prototype (avant les animations : la carte doit exister) ---------- */
initSim($('[data-sim]'), { gsap: reduced ? null : gsap })

/* ---------- Polices prêtes (plafonné à 1,5 s) ---------- */
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))])
fontsReady.then(() => $('.hero__inner').classList.add('is-ready'))

/* ---------- Animations ---------- */
const mm = gsap.matchMedia()

mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 821px)' }, (ctx) => {
  const { motion, desktop } = ctx.conditions
  if (!motion) {
    gsap.set('[data-reveal]', { opacity: 1, y: 0 })
    $$('[data-count]').forEach((el) => (el.textContent = formatCount(el, +el.dataset.count)))
    $$('.module').forEach((m) => m.classList.add('is-active'))
    return
  }

  // Intro héro : lancée une fois les polices prêtes (évite tout décalage de mise en page)
  const heroWords = $$('.hero__title .w > span')
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
  intro.from(heroWords, { yPercent: 110, rotate: 4, duration: 1.4, stagger: 0.06 }, 0.15)
    .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.2)
    .from('.nav', { opacity: 0, duration: 1 }, 0.6)
  fontsReady.then(() => intro.play())

  // Vagues + pluie qui s'intensifie au scroll
  gsap.to('[data-wave="1"]', { attr: { d: 'M0 100 C 240 150 480 70 720 110 S 1200 160 1440 100 V220 H0Z' }, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  gsap.to('[data-wave="2"]', { attr: { d: 'M0 140 C 240 180 480 120 720 160 S 1200 120 1440 140 V220 H0Z' }, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (st) => rainFx.set(1 + st.progress * 1.6),
  })
  gsap.to('.hero__water', { height: '60vh', ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  gsap.to('.hero__inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })

  // Titres de section
  $$('[data-split]').forEach((el) => {
    if (el.closest('.hero')) return
    gsap.from($$('.w > span', el), {
      yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })

  // Apparitions
  ScrollTrigger.batch($$('[data-reveal]').filter((e) => !e.closest('.hero')), {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  })

  // Compteurs
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count
    const o = { v: 0 }
    gsap.to(o, {
      v: to, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = formatCount(el, o.v)),
    })
  })

  // Chronologie : épinglage + défilement horizontal
  const track = $('[data-chrono-track]')
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth)
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.chrono', start: 'top top', end: () => `+=${dist() + window.innerHeight * 0.3}`, pin: '.chrono__pin', scrub: 0.6, invalidateOnRefresh: true },
  })

  // Anneau des causes
  const ring = $('[data-draw]')
  const len = 2 * Math.PI * 150
  gsap.fromTo(ring, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.loop', start: 'top 80%', end: 'bottom 60%', scrub: true } })

  // Silos → Kanivo
  const silo = gsap.timeline({ scrollTrigger: { trigger: '.silos', start: 'top 60%', end: 'center 45%', scrub: 0.8 } })
  silo.from('[data-node]', { x: (i) => [-40, 40, -40, 40, 0, 0][i], y: (i) => [-30, -30, 30, 30, -40, 40][i], opacity: 0.4, stagger: 0.05 })
    .from('.silos__core', { scale: 0, ease: 'back.out(1.6)' }, '<0.2')
    .to('.silos__links line', { opacity: 0.8, strokeDashoffset: -40, stagger: 0.05 }, '<0.1')
    .to('[data-node] circle', { stroke: 'rgba(58,214,200,.8)', stagger: 0.04 }, '<')

  // Solution : écran du téléphone synchronisé avec le module actif
  const screens = $$('[data-screen]')
  $$('[data-module]').forEach((m, i) => {
    ScrollTrigger.create({
      trigger: m, start: desktop ? 'top 55%' : 'top 70%', end: desktop ? 'bottom 55%' : 'bottom 70%',
      onToggle: (st) => {
        if (!st.isActive) return
        $$('.module').forEach((x) => x.classList.toggle('is-active', x === m))
        screens.forEach((s, j) => s.classList.toggle('is-active', j === i))
      },
    })
  })
  gsap.from('[data-phone]', { rotate: -6, y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.solution__grid', start: 'top 80%' } })

  // Prototype : la carte entre en scène
  gsap.from('[data-communes] .commune', { scale: 0, transformOrigin: 'center', transformBox: 'fill-box', duration: 0.9, ease: 'back.out(1.8)', stagger: 0.04, scrollTrigger: { trigger: '[data-map]', start: 'top 80%' } })
  gsap.from('.map__lagoon', { scaleX: 0, transformOrigin: '0 50%', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '[data-map]', start: 'top 80%' } })

  // Feuille de route
  gsap.fromTo('[data-steps]', { '--progress': 0 }, { '--progress': 1, ease: 'none', scrollTrigger: { trigger: '[data-steps]', start: 'top 75%', end: 'bottom 55%', scrub: true } })
  gsap.from('.step', { opacity: 0, y: 30, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '[data-steps]', start: 'top 80%' } })

  // Signature de pied de page
  gsap.from('.footer__sig', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer__sig', start: 'top 95%' } })
})

function formatCount(el, v) {
  const d = +(el.dataset.decimals || 0)
  const n = d ? v.toFixed(d).replace('.', ',') : Math.round(v)
  return el.dataset.format === 'space' ? new Intl.NumberFormat('fr-FR').format(n) : String(n)
}

/* ---------- Navigation ---------- */
const nav = $('[data-nav]')
const bar = $('[data-progress]')
let lastY = 0
function onScroll() {
  const y = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`
  nav.classList.toggle('is-solid', y > 40)
  nav.classList.toggle('is-hidden', y > lastY && y > 600 && !nav.contains(document.activeElement))
  lastY = y
}
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

const links = $$('.nav nav a')
const inView = new Set()
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? inView.add(e.target.id) : inView.delete(e.target.id)))
  links.forEach((a) => {
    const on = inView.has(a.getAttribute('href').slice(1))
    a.classList.toggle('is-current', on)
    on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')
  })
}, { rootMargin: '-45% 0px -50% 0px' })
links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s) })


// Polices chargées → recalcul des positions
document.fonts?.ready.then(() => ScrollTrigger.refresh())
