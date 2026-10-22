// Recette automatisée : node scripts/qa.mjs [url]
// Parcourt le site en desktop, mobile et reduced-motion, vérifie la console,
// les débordements horizontaux et le simulateur, puis enregistre des captures.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const URL = process.argv[2] || 'http://localhost:4173/'
const OUT = 'livrable/captures'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await mkdir(OUT, { recursive: true })

const results = { url: URL, date: new Date().toISOString(), runs: [] }
const browser = await chromium.launch()

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 500) {
    await page.mouse.wheel(0, 500)
    await sleep(120)
  }
  await sleep(800)
}

async function shot(page, selector, name, offset = 0) {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s)
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + o)
  }, [selector, offset])
  await sleep(1600)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

async function run(name, ctxOpts, { shots = [], sim = false } = {}) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))
  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'networkidle' })
  const loadMs = Date.now() - t0
  await sleep(2500)
  await page.screenshot({ path: `${OUT}/${name}-01-hero.png` })
  await scrollThrough(page)

  const checks = await page.evaluate(() => {
    const doc = document.documentElement
    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].length
    const h1 = document.querySelectorAll('h1').length
    const headings = [...document.querySelectorAll('h1,h2,h3')].length
    const counters = [...document.querySelectorAll('[data-count]')].map((e) => e.textContent)
    const communes = document.querySelectorAll('[data-communes] .commune').length
    return { overflowX: doc.scrollWidth > window.innerWidth + 1, scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, h1, headings, imgsNoAlt, counters, communes, lang: doc.lang }
  })

  let simResult = null
  if (sim) {
    await page.evaluate(() => document.querySelector('[data-sim]').scrollIntoView())
    await sleep(1200)
    const kpis = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-kpi]')].map((e) => [e.dataset.kpi, e.textContent])))
    await page.click('[data-rain="210"]'); await sleep(1500)
    const sans = await kpis()
    await page.click('[data-mode="avec"]'); await sleep(1800)
    const avec = await kpis()
    await page.screenshot({ path: `${OUT}/${name}-sim-avec-kanivo.png` })
    await page.click('[data-mode="sans"]'); await sleep(1800)
    await page.screenshot({ path: `${OUT}/${name}-sim-sans-kanivo.png` })
    await page.focus('[data-communes] .commune[data-id="attecoube"]')
    await page.keyboard.press('Enter'); await sleep(400)
    const detail = await page.textContent('[data-detail]')
    await page.selectOption('[data-r-commune]', 'abobo')
    await page.click('[data-report] button[type="submit"]'); await sleep(600)
    const report = await page.textContent('[data-r-msg]')
    simResult = { extremeSansKanivo: sans, extremeAvecKanivo: avec, keyboardSelect: detail.replace(/\s+/g, ' ').trim(), report }
  }

  for (const [sel, file, off] of shots) await shot(page, sel, `${name}-${file}`, off)
  results.runs.push({ name, viewport: ctxOpts.viewport, reducedMotion: ctxOpts.reducedMotion || 'no-preference', loadMs, consoleErrors: errors, failedRequests: failed, checks, sim: simResult })
  await ctx.close()
}

const SHOTS = [
  ['#constat', '02-constat', -40],
  ['#chronologie', '03-chronologie', 600],
  ['#causes', '04-causes', 200],
  ['#silos', '05-silos', 100],
  ['[data-module="3"]', '06-solution', -200],
  ['[data-sim]', '07-prototype', -100],
  ['#modele', '08-modele', 0],
  ['#roadmap', '09-roadmap', 0],
  ['#masterclass', '10-masterclass', 0],
]

await run('desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, { shots: SHOTS, sim: true })
await run('mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { shots: SHOTS.filter((s) => ['02-constat', '06-solution', '07-prototype', '09-roadmap'].includes(s[1])), sim: true })
await run('reduced-motion', { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, { shots: [['#chronologie', '03-chronologie', 0]] })

await browser.close()
await writeFile('livrable/tests/qa-results.json', JSON.stringify(results, null, 2))
const bad = results.runs.filter((r) => r.consoleErrors.length || r.failedRequests.length || r.checks.overflowX)
console.log(JSON.stringify(results.runs.map((r) => ({ name: r.name, loadMs: r.loadMs, errors: r.consoleErrors.length, failed: r.failedRequests.length, overflowX: r.checks.overflowX, counters: r.checks.counters.join(' '), sim: r.sim && { sans: r.sim.extremeSansKanivo, avec: r.sim.extremeAvecKanivo } })), null, 2))
process.exit(bad.length ? 1 : 0)
