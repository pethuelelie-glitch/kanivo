// Génère livrable/Kanivo-Inondations-Abidjan.pptx — node deck/build-deck.cjs
// Deck structuré : thème, layouts (masters pptxgenjs), sections, graphiques natifs,
// transitions Morph et animations d'entrée chorégraphiées (deck/motion.cjs).
const path = require('path')
const fs = require('fs')
const pptxgen = require('pptxgenjs')
const sharp = require('sharp')
const { createMotion, applyMotion } = require('./motion.cjs')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'livrable', 'Kanivo-Inondations-Abidjan.pptx')
const CAPTURES = path.join(ROOT, 'livrable', 'captures')

const HEX = {
  ink: '04111A', ink2: '0B2230', line: '1C3A48', text: 'E9F1F2', muted: '93ABB2',
  water: '3AD6C8', orange: 'FF8A1F', amber: 'FFC54D', green: '22C08A', red: 'FF5A52',
}
const THEME = {
  name: 'Kanivo Nuit',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: HEX.ink, lt1: 'FFFFFF', dk2: HEX.ink2, lt2: HEX.text,
    accent1: HEX.water, accent2: HEX.orange, accent3: HEX.amber, accent4: HEX.green, accent5: HEX.red, accent6: HEX.muted,
    hlink: HEX.water, folHlink: HEX.muted,
  },
}

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
pres.title = 'Kanivo — Inondations à Abidjan'
pres.author = 'ELIE EHOUSSOU'
pres.subject = 'Analyse et proposition de solution numérique'
const C = pres.SchemeColor
const W = 13.333
const M = 0.6

/* ---------- Thème ---------- */
// pptxgenjs n'écrit pas les couleurs du thème : on remplace le clrScheme et les polices de theme1.xml.
async function applyTheme(file, theme) {
  const JSZip = require('jszip')
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  const part = 'ppt/theme/theme1.xml'
  let xml = await zip.file(part).async('string')
  const slot = (k) => `<a:${k}><a:srgbClr val="${theme.colors[k]}"/></a:${k}>`
  const keys = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
  xml = xml.replace(/<a:clrScheme name="[^"]*">[\s\S]*?<\/a:clrScheme>/, `<a:clrScheme name="${theme.name}">${keys.map(slot).join('')}</a:clrScheme>`)
  xml = xml.replace(/(<a:majorFont>\s*<a:latin typeface=")[^"]*"/, `$1${theme.headFontFace}"`)
  xml = xml.replace(/(<a:minorFont>\s*<a:latin typeface=")[^"]*"/, `$1${theme.bodyFontFace}"`)
  zip.file(part, xml)
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

/* ---------- Visuels générés ---------- */
function rainSvg(w, h, { glow = true, seed = 7, density = 140 } = {}) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  let lines = ''
  for (let i = 0; i < density; i++) {
    const x = rnd() * w, y = rnd() * h, z = rnd(), len = 20 + z * 60
    lines += `<line x1="${x}" y1="${y}" x2="${x + len * 0.18}" y2="${y - len}" stroke="#A0E6E4" stroke-opacity="${(0.05 + z * 0.22).toFixed(2)}" stroke-width="${(1 + z * 1.5).toFixed(1)}" stroke-linecap="round"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g1" cx="50%" cy="110%" r="70%"><stop offset="0" stop-color="#0F6F74" stop-opacity=".75"/><stop offset="1" stop-color="#0F6F74" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="85%" cy="100%" r="40%"><stop offset="0" stop-color="#FF8A1F" stop-opacity=".22"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#04111A"/>
    ${glow ? '<rect width="100%" height="100%" fill="url(#g1)"/><rect width="100%" height="100%" fill="url(#g2)"/>' : ''}
    ${lines}
    <path d="M0 ${h * 0.86} C ${w * 0.18} ${h * 0.82} ${w * 0.32} ${h * 0.9} ${w * 0.5} ${h * 0.86} S ${w * 0.82} ${h * 0.82} ${w} ${h * 0.86} V ${h} H 0 Z" fill="#0F6F74" fill-opacity=".35"/>
  </svg>`
}
async function svgPng(svg) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer()
  return 'image/png;base64,' + buf.toString('base64')
}
async function icon(name, color = '#3AD6C8', px = 256) {
  let svg = fs.readFileSync(path.join(ROOT, 'node_modules', 'lucide-static', 'icons', `${name}.svg`), 'utf8')
  svg = svg.replace(/stroke="currentColor"/g, `stroke="${color}"`).replace(/width="24"/, `width="${px}"`).replace(/height="24"/, `height="${px}"`)
  return svgPng(svg)
}

/* ---------- Layouts ---------- */
function defineLayouts(bgTitle, bgSection) {
  const footer = [
    { text: { text: 'Kanivo · Inondations à Abidjan · Octobre 2026', options: { x: M, y: 7.0, w: 7, h: 0.3, fontSize: 10, color: C.accent6, margin: 0 } } },
  ]
  pres.defineSlideMaster({
    title: 'KANIVO_TITRE',
    background: { data: bgTitle },
    objects: [
      { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 1.55, w: 9, h: 0.4, fontSize: 13, bold: true, color: C.accent1, charSpacing: 3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 2.05, w: 10.2, h: 2.2, fontFace: THEME.headFontFace, fontSize: 54, color: C.background2, margin: 0, valign: 'top', align: 'left' }, text: '' } },
      { placeholder: { options: { name: 'subtitle', type: 'body', x: M, y: 4.35, w: 8.6, h: 1.0, fontSize: 18, color: C.background2, margin: 0, valign: 'top' }, text: '' } },
    ],
  })
  pres.defineSlideMaster({
    title: 'KANIVO_SECTION',
    background: { data: bgSection },
    objects: [
      { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 2.2, w: 9, h: 0.4, fontSize: 13, bold: true, color: C.accent2, charSpacing: 3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 2.7, w: 11, h: 1.5, fontFace: THEME.headFontFace, fontSize: 60, color: C.background2, margin: 0, valign: 'top', align: 'left' }, text: '' } },
      { placeholder: { options: { name: 'subtitle', type: 'body', x: M, y: 4.3, w: 10, h: 0.8, fontSize: 22, color: C.accent1, margin: 0, valign: 'top' }, text: '' } },
    ],
    slideNumber: { x: 12.1, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.accent6, align: 'right' },
  })
  pres.defineSlideMaster({
    title: 'KANIVO_CONTENU',
    background: { color: HEX.ink },
    margin: [0.5, M, 0.6, M],
    objects: [
      ...footer,
      { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 0.42, w: 9, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.75, w: 12.1, h: 0.95, fontFace: THEME.headFontFace, fontSize: 30, color: C.background2, margin: 0, valign: 'top', align: 'left' }, text: '' } },
      { placeholder: { options: { name: 'source', type: 'body', x: M, y: 6.62, w: 12.1, h: 0.3, fontSize: 10, italic: true, color: C.accent6, margin: 0, valign: 'top' }, text: '' } },
    ],
    slideNumber: { x: 12.1, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.accent6, align: 'right' },
  })
}

/* ---------- Helpers ---------- */
let n = 0
const id = (p) => `${p}-${++n}`
const motion = createMotion()
const beat = (fx, gap, dur) => motion.beat(fx, gap, dur)
const reg = (name, fx) => { motion.reg(name, fx); return name }
function content(section, kicker, title, source) {
  const s = pres.addSlide({ masterName: 'KANIVO_CONTENU', sectionTitle: section })
  motion.slide('morph') // les titres morphent d'une slide à l'autre ; le contenu entre en cascade
  s.addText(kicker.toUpperCase(), { placeholder: 'kicker' })
  s.addText(title, { placeholder: 'title' })
  if (source) s.addText(source, { placeholder: 'source' })
  return s
}
function card(s, x, y, w, h, opts = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.12, objectName: reg(id('carte')),
    fill: { color: opts.fill || C.text2, transparency: opts.transparency || 0 },
    line: { color: opts.line || HEX.line, width: opts.lineWidth || 0.75 },
  })
}
// Espaces insécables : un nombre ne se sépare jamais de son unité ni de ses milliers.
const nb = (t) => t.replace(/(\d) (?=\d{3})/g, '$1 ').replace(/(\d) (?=(%|t|M|M\$|j|mm|km|min)(?![\p{L}]))/gu, '$1 ').replace(/([≥<×→]) /g, '$1 ')
function text(s, t, o) {
  t = typeof t === 'string' ? nb(t) : t.map((run) => ({ ...run, text: nb(run.text) }))
  const { fx, ...rest } = o
  s.addText(t, { isTextBox: true, margin: 0, valign: 'top', color: C.background2, fontSize: 14, objectName: reg(id('texte'), fx), ...rest })
}
function badge(s, x, y, label, color = C.accent1, d = 0.5) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: HEX.ink }, line: { color, width: 1.25 }, objectName: reg(id('pastille')) })
  text(s, label, { x, y, w: d, h: d, align: 'center', valign: 'middle', fontSize: 13, bold: true, color })
}
function iconCircle(s, data, x, y, d = 0.62) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: HEX.water, transparency: 85 }, line: { color: HEX.water, width: 0.75, transparency: 40 }, objectName: reg(id('cercle-icone')) })
  s.addImage({ data, x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: reg(id('icone')) })
}
const axis = {
  catAxisLabelColor: HEX.muted, valAxisLabelColor: HEX.muted, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11,
  catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt', titleFontFace: '+mn-lt', legendFontFace: '+mn-lt',
  catAxisLineShow: false, valAxisLineShow: false,
  catGridLine: { style: 'none' },
  dataLabelColor: HEX.text, dataLabelFontSize: 13, dataLabelFontBold: true,
  titleColor: HEX.text, titleFontSize: 14,
}

/* ---------- Construction ---------- */
async function build() {
  const bgTitle = await svgPng(rainSvg(1920, 1080, { density: 170 }))
  const bgSection = await svgPng(rainSvg(1920, 1080, { density: 90, seed: 42 }))
  defineLayouts(bgTitle, bgSection)
  const I = {}
  for (const [k, name, color] of [
    ['camera', 'camera'], ['map', 'map'], ['truck', 'truck'], ['bell', 'bell-ring'], ['scan', 'scan-eye'],
    ['route', 'route'], ['landmark', 'landmark'], ['coins', 'hand-coins'], ['radio', 'radio'], ['shield', 'shield-check'],
    ['users', 'users'], ['trend', 'trending-up'], ['brief', 'briefcase'], ['rain', 'cloud-rain'], ['siren', 'siren'],
    ['phone', 'smartphone'], ['drops', 'droplets'], ['build', 'construction'],
  ]) I[k] = await icon(name, color)

  /* 1 — Titre */
  pres.addSection({ title: 'Ouverture' })
  let s = pres.addSlide({ masterName: 'KANIVO_TITRE', sectionTitle: 'Ouverture' })
  motion.slide('fade')
  beat('fade', 0, 900)
  s.addText('NOTE STRATÉGIQUE · OCTOBRE 2026', { placeholder: 'kicker' }); reg('ph-1')
  beat('float', 250, 1100)
  s.addText([{ text: 'À Abidjan, la pluie ' }, { text: 'ne tue pas', options: { italic: true, color: C.accent1 } }, { text: ' seule' }], { placeholder: 'title' }); reg('ph-2')
  beat('fade', 500, 900)
  s.addText('Kanivo : signaler les caniveaux bouchés, prioriser le curage, prévenir les quartiers exposés. Une réponse numérique aux inondations meurtrières du District d\'Abidjan.', { placeholder: 'subtitle' }); reg('ph-3')
  beat('float', 450)
  card(s, 9.7, 5.55, 3.05, 1.2, { fill: HEX.ink, transparency: 20, line: HEX.orange })
  text(s, '59 morts', { x: 9.95, y: 5.68, w: 2.6, h: 0.5, fontFace: THEME.headFontFace, fontSize: 28, color: C.accent2 })
  text(s, 'après les pluies du 28-29 juin 2026 (Gouvernement)', { x: 9.95, y: 6.2, w: 2.65, h: 0.5, fontSize: 11, color: C.background2 })
  s.addNotes('Ouvrir sur le chiffre de juin 2026 : 59 morts en une nuit. Le message : ce n\'est pas une fatalité climatique, c\'est un problème de coordination que le numérique peut traiter.')

  /* 2 — Synthèse */
  s = content('Ouverture', 'Synthèse', 'Un problème de coordination, pas seulement de pluie', 'Sources : Gouvernement (juil. 2026), GFDRR City Scan, Banque mondiale P168308, Ministère de la Salubrité (mars 2026).')
  const syn = [
    ['1', 'Le problème', 'Chaque saison des pluies tue à Abidjan : 18 morts en 2018, 24 en 2024, 59 en 2026. Plus d\'un quart du district est exposé aux inondations et aux glissements de terrain.', C.accent2],
    ['2', 'Le diagnostic', 'Les caniveaux sont bouchés par environ 5 000 t de déchets produits chaque jour, le curage est réactif, et l\'alerte n\'atteint pas le dernier kilomètre. Les acteurs travaillent en silos.', C.accent1],
    ['3', 'La proposition', 'Kanivo relie signalement citoyen, score de risque hyperlocal, curage priorisé et alerte multilingue géociblée, sur USSD, SMS, vocal et WhatsApp.', C.accent4],
  ]
  syn.forEach(([k, t, d, col], i) => {
    const x = M + i * 4.1
    beat('float', 220)
    card(s, x, 1.95, 3.85, 3.35)
    badge(s, x + 0.35, 2.25, k, col)
    text(s, t, { x: x + 0.35, y: 2.95, w: 3.2, h: 0.5, fontFace: THEME.headFontFace, fontSize: 22 })
    text(s, d, { x: x + 0.35, y: 3.5, w: 3.2, h: 1.7, fontSize: 14, color: C.accent6 })
  })
  beat('wipe-right', 350)
  card(s, M, 5.5, 12.1, 0.9, { fill: HEX.orange, transparency: 88, line: HEX.orange })
  text(s, [{ text: 'Décision attendue : ', options: { bold: true, color: C.accent2 } }, { text: 'lancer un pilote de 6 mois à Attécoubé et Abobo, opérationnel avant le 15 mai 2027.' }], { x: M + 0.35, y: 5.5, w: 11.4, h: 0.9, valign: 'middle', fontSize: 16 })
  s.addNotes('Structure pyramidale : problème, diagnostic, proposition, puis la décision demandée.')

  /* 3 — Constat */
  pres.addSection({ title: 'Problème et données' })
  s = content('Problème et données', '01 · Le constat', 'Un bilan qui s\'alourdit dans une ville de 6,3 millions d\'habitants', 'Sources : Gouvernement via Fratmat/AllAfrica (1er juil. 2026) ; GFDRR City Scan ; Ministère de l\'Hydraulique, de l\'Assainissement et de la Salubrité (mars 2026) ; INS, RGPH 2021.')
  const stats = [
    ['59', 'morts annoncés après les pluies du 28-29 juin 2026', C.accent2],
    ['26 %', 'du district exposé aux inondations et aux glissements de terrain', C.background2],
    ['5 000 t', 'de déchets solides produits chaque jour à Abidjan', C.background2],
    ['6,3 M', 'habitants dans le District autonome (RGPH 2021)', C.background2],
  ]
  stats.forEach(([v, l, col], i) => {
    const x = M + i * 3.07
    beat('float', 200)
    card(s, x, 2.0, 2.87, 2.75)
    text(s, v, { x: x + 0.3, y: 2.3, w: 2.4, h: 1.0, fontFace: THEME.headFontFace, fontSize: 44, color: col })
    text(s, l, { x: x + 0.3, y: 3.45, w: 2.35, h: 1.1, fontSize: 14, color: C.accent6 })
  })
  beat('fade', 350)
  iconCircle(s, I.drops, M, 5.2)
  text(s, [{ text: 'Lecture : ', options: { bold: true } }, { text: 'les moyens existent (pluviomètres, grands travaux, 49,7 M d\'abonnements mobiles). Ce qui manque, c\'est la coordination de terrain avant et pendant la pluie.' }], { x: M + 0.85, y: 5.2, w: 11.2, h: 0.65, valign: 'middle', fontSize: 15 })

  /* 4 — Chronologie (graphique) */
  s = content('Problème et données', '02 · Trente ans de répétition', '2026 est l\'épisode le plus meurtrier jamais recensé', 'Sources : presse nationale et internationale ; ONPC (juin 2024) ; Gouvernement (juil. 2026). Bilans provisoires pour 2025.')
  beat('wipe-up', 0, 1200)
  s.addChart(pres.charts.BAR, [{ name: 'Morts', labels: ['1996', '2018', '2024', '2025*', '2026'], values: [28, 18, 24, 6, 59] }], {
    x: M, y: 1.85, w: 7.6, h: 4.55, barDir: 'col', barGapWidthPct: 55,
    chartColors: [HEX.muted, HEX.muted, HEX.muted, HEX.muted, HEX.orange],
    showValue: true, dataLabelPosition: 'outEnd', valAxisHidden: true, valGridLine: { style: 'none' },
    showTitle: true, title: 'Morts par épisode majeur de pluies à Abidjan', showLegend: false, ...axis, objectName: reg('graphique-morts'),
  })
  beat('float', 300)
  card(s, 8.6, 1.95, 4.1, 4.35)
  const chronoPts = [
    ['Récurrence', 'Un épisode meurtrier presque chaque saison, de mai à juillet.'],
    ['Aggravation', '59 morts en une nuit en 2026, plus du double de 2024.'],
    ['Localisation', 'Attécoubé concentre une vingtaine de victimes en 2026, sur des sites évacués puis réoccupés.'],
  ]
  chronoPts.forEach(([t, d], i) => {
    beat('fade', 250)
    text(s, t, { x: 8.9, y: 2.2 + i * 1.32, w: 3.5, h: 0.35, bold: true, fontSize: 15, color: C.accent1 })
    text(s, d, { x: 8.9, y: 2.55 + i * 1.32, w: 3.55, h: 0.85, fontSize: 14, color: C.background2 })
  })

  /* 5 — Exposition */
  s = content('Problème et données', '03 · Exposition', 'Écoles, hôpitaux et routes sont en première ligne', 'Sources : GFDRR City Scan Abidjan ; Banque mondiale / GFDRR, PDNA 2018 ; UNDRR, profil de risque (perte modélisée).')
  beat('wipe-right', 0, 1100)
  s.addChart(pres.charts.BAR, [{ name: 'Part en zone à risque', labels: ['Hôpitaux', 'Routes principales', 'Écoles', 'Surface du district'], values: [18, 22, 23, 26] }], {
    x: M, y: 1.85, w: 7.4, h: 4.5, barDir: 'bar', barGapWidthPct: 45, chartColors: [HEX.water],
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"', valAxisHidden: true, valAxisMaxVal: 35, valGridLine: { style: 'none' },
    showTitle: true, title: 'Part exposée aux inondations et glissements de terrain (%)', showLegend: false, ...axis, objectName: reg('graphique-exposition'),
  })
  beat('float', 400)
  card(s, 8.4, 1.95, 4.3, 2.05, { line: HEX.orange })
  text(s, '≈ 443 M$', { x: 8.7, y: 2.15, w: 3.8, h: 0.75, fontFace: THEME.headFontFace, fontSize: 36, color: C.accent2 })
  text(s, 'de perte probable pour une crue centennale à l\'échelle nationale (modèle UNDRR)', { x: 8.7, y: 2.95, w: 3.75, h: 0.9, fontSize: 14, color: C.accent6 })
  beat('float', 250)
  card(s, 8.4, 4.25, 4.3, 2.05)
  text(s, '1 140', { x: 8.7, y: 4.45, w: 3.8, h: 0.75, fontFace: THEME.headFontFace, fontSize: 36, color: C.background2 })
  text(s, 'bâtiments résidentiels endommagés lors de l\'épisode de juin 2018', { x: 8.7, y: 5.25, w: 3.75, h: 0.9, fontSize: 14, color: C.accent6 })

  /* 6 — Causes */
  pres.addSection({ title: 'Analyse' })
  s = content('Analyse', '04 · Arbre des causes', 'Quatre causes qui s\'entretiennent les unes les autres', 'Sources : Banque mondiale P168308 ; ONU-Habitat (données ANASUR 2016) ; GFDRR ; Gouvernement (juil. 2026) ; AIP (chaîne d\'alerte).')
  const causes = [
    ['A', 'Drainage obstrué', 'Déchets, sédiments et constructions bouchent les caniveaux. Environ 2 000 t/jour échappaient à la collecte (2016). Le curage est réactif.'],
    ['B', 'Urbanisation non planifiée', 'La population a plus que doublé depuis 2001. Bassins d\'orage et talwegs sont occupés.'],
    ['C', 'Retour en zone rouge', 'Sans relogement suivi, les sites évacués sont réoccupés, comme à Attécoubé en 2026.'],
    ['D', 'Alerte qui n\'arrive pas', 'Messages génériques, en français, relayés par WhatsApp. Rien ne confirme qu\'ils ont été reçus.'],
  ]
  causes.forEach(([k, t, d], i) => {
    const x = M + (i % 2) * 4.3, y = 1.95 + Math.floor(i / 2) * 2.3
    beat('float', 220)
    card(s, x, y, 4.1, 2.1)
    badge(s, x + 0.3, y + 0.3, k)
    text(s, t, { x: x + 1.0, y: y + 0.32, w: 2.9, h: 0.5, fontFace: THEME.headFontFace, fontSize: 18 })
    text(s, d, { x: x + 0.3, y: y + 0.95, w: 3.55, h: 1.1, fontSize: 14, color: C.accent6 })
  })
  beat('float', 350)
  card(s, 9.3, 1.95, 3.4, 4.4, { fill: HEX.water, transparency: 90, line: HEX.water })
  iconCircle(s, I.scan, 9.6, 2.25)
  text(s, 'Le fil commun', { x: 9.6, y: 3.05, w: 2.9, h: 0.45, fontFace: THEME.headFontFace, fontSize: 20, color: C.accent1 })
  text(s, 'Personne ne voit en temps réel l\'état des caniveaux, la pluie prévue et les personnes exposées, au même endroit et au même moment.', { x: 9.6, y: 3.6, w: 2.85, h: 2.5, fontSize: 15 })

  /* 7 — Acteurs */
  s = content('Analyse', '05 · Cartographie des acteurs', 'Chacun détient une pièce du puzzle, personne ne l\'assemble', 'Sources : GWP Afrique de l\'Ouest (2023) ; Fratmat (53 stations SODEXAM) ; Banque mondiale ; BAD (PAACA, 2021).')
  const hdr = (t) => ({ text: t, options: { bold: true, color: HEX.water, fill: { color: HEX.ink2 }, fontSize: 13 } })
  const rows = [
    ['SODEXAM', 'Prévision météo, vigilance, 53 stations pluviométriques', 'Un canal de diffusion quartier par quartier'],
    ['ONPC', 'Zones à risque, secours, évacuation', 'Une vision temps réel du terrain'],
    ['ANAGED', 'Collecte, pré-collecte, curage', 'Une priorisation par le risque, des preuves d\'intervention'],
    ['Ministère de l\'Assainissement', 'Politique, grands travaux (Gourou, PAACA)', 'Des indicateurs par bassin versant'],
    ['District et 13 communes', 'Salubrité de proximité, brigades', 'Des outils numériques de suivi'],
    ['Bailleurs (BM, BAD, AFD)', 'Financement des ouvrages (315 M$ côté Banque mondiale)', 'Une mesure de l\'entretien après livraison'],
    ['Opérateurs télécoms', 'SMS, cell broadcast, mobile money', 'Des contenus d\'alerte prêts à diffuser'],
    ['Habitants', 'Premiers témoins, premiers secours', 'Un moyen simple de signaler et d\'être entendus'],
  ]
  beat('wipe-down', 0, 1200)
  s.addTable([[hdr('Acteur'), hdr('Rôle'), hdr('Ce qui lui manque')], ...rows.map((r) => r.map((c, j) => ({ text: c, options: { color: j === 2 ? HEX.amber : j === 0 ? HEX.text : HEX.muted, bold: j === 0 } })))], {
    x: M, y: 1.9, w: 12.1, colW: [3.0, 4.75, 4.35], fontSize: 13, fontFace: 'Calibri', color: HEX.text,
    border: { type: 'solid', pt: 0.5, color: HEX.line }, fill: { color: HEX.ink }, rowH: 0.5, valign: 'middle', margin: [0.04, 0.12, 0.04, 0.12], objectName: reg('tableau-acteurs'),
  })

  /* 8 — Existant */
  s = content('Analyse', '06 · Pourquoi l\'existant échoue', 'On finance les ouvrages, pas leur entretien ni l\'alerte', 'Sources : BAD (bassin du Gourou, PAACA : 16,15 km de canaux) ; DG Trésor (FASEP, 2022) ; Abidjan.net (VIGICLIMM) ; AIP ; Gouvernement (2026).')
  const exist = [
    [I.build, 'Grands travaux de drainage', 'Capacité hydraulique accrue (Gourou, PAACA)', 'Un ouvrage neuf bouché par les déchets perd sa capacité en une saison. L\'entretien n\'est pas piloté par la donnée.'],
    [I.rain, 'Vigilance météo et capteurs', 'Bonne connaissance des précipitations (SODEXAM, VIGICLIMM, HD Rain)', 'La donnée reste dans les institutions. Aucun message hyperlocal ni actionnable.'],
    [I.radio, 'Alertes WhatsApp et relais', 'Rapides et gratuites', 'Hétérogènes et non traçables : on ne sait ni qui a reçu, ni qui a agi.'],
    [I.siren, 'Déguerpissements', 'Retirent des personnes du danger', 'Sans suivi ni accompagnement, les sites sont réoccupés.'],
  ]
  beat('fade')
  text(s, 'DISPOSITIF', { x: M + 0.85, y: 1.8, w: 3.5, h: 0.3, fontSize: 11, bold: true, color: C.accent6, charSpacing: 2 })
  text(s, 'CE QU\'IL APPORTE', { x: 4.95, y: 1.8, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: C.accent6, charSpacing: 2 })
  text(s, 'POURQUOI ÇA NE SUFFIT PAS', { x: 8.6, y: 1.8, w: 4.0, h: 0.3, fontSize: 11, bold: true, color: C.accent2, charSpacing: 2 })
  exist.forEach(([ic, t, a, l], i) => {
    const y = 2.2 + i * 1.08
    beat('wipe-right', 220)
    card(s, M, y, 12.1, 0.95)
    iconCircle(s, ic, M + 0.18, y + 0.17)
    text(s, t, { x: M + 0.95, y, w: 3.3, h: 0.95, valign: 'middle', fontFace: THEME.headFontFace, fontSize: 16 })
    text(s, a, { x: 4.95, y, w: 3.4, h: 0.95, valign: 'middle', fontSize: 14, color: C.accent6 })
    text(s, l, { x: 8.6, y, w: 3.95, h: 0.95, valign: 'middle', fontSize: 14, color: C.background2 })
  })

  /* 9 — Section Solution */
  pres.addSection({ title: 'Solution' })
  s = pres.addSlide({ masterName: 'KANIVO_SECTION', sectionTitle: 'Solution' })
  motion.slide('push')
  beat('fade', 0, 700)
  s.addText('LA SOLUTION', { placeholder: 'kicker' }); reg('ph-1')
  beat('zoom', 250, 900)
  s.addText('Kanivo', { placeholder: 'title' }); reg('ph-2')
  beat('wipe-right', 450, 1000)
  s.addText('Voir · Prioriser · Prévenir', { placeholder: 'subtitle' }); reg('ph-3')
  beat('fade', 600, 900)
  text(s, '« Kanivo » vient de « caniveau », écrit comme on le prononce à Abidjan. L\'ambition : rendre visible l\'infrastructure invisible.', { x: M, y: 5.2, w: 8.5, h: 0.8, fontSize: 16, color: C.background2, italic: true })

  /* 10 — Modules */
  s = content('Solution', '07 · Quatre modules', 'Une boucle de données, conçue d\'abord pour le téléphone simple', 'Hypothèses de conception Kanivo. Langues d\'alerte : dioula, baoulé, nouchi et français.')
  const mods = [
    [I.camera, '01 · Signal', 'Signaler en 20 secondes', 'WhatsApp, USSD *700#, appli web légère. Photo, position GPS et gravité. L\'IA estime l\'obstruction et écarte les doublons.', 'Citoyens, brigades'],
    [I.map, '02 · Carte de risque', 'Un score par îlot de 250 m', 'Pluie prévue × obstruction × pente × population exposée, recalculé chaque heure.', 'ANAGED, communes, ONPC'],
    [I.truck, '03 · Curage priorisé', 'Curer avant la pluie', 'Ordres de mission classés par risque, tournées optimisées, photo avant/après, paiement au résultat.', 'Brigades, prestataires'],
    [I.bell, '04 · Alerte', 'Le dernier kilomètre', 'SMS, vocal, WhatsApp et cell broadcast géociblés, 6 à 24 h avant. Un refuge et un accusé « tapez 1 ».', 'Habitants exposés'],
  ]
  mods.forEach(([ic, k, t, d, who], i) => {
    const x = M + i * 3.07
    beat('float', 220)
    card(s, x, 1.95, 2.87, 4.45)
    iconCircle(s, ic, x + 0.28, 2.22, 0.7)
    text(s, k.toUpperCase(), { x: x + 0.28, y: 3.08, w: 2.4, h: 0.3, fontSize: 11, bold: true, color: C.accent2, charSpacing: 1 })
    text(s, t, { x: x + 0.28, y: 3.42, w: 2.4, h: 0.75, fontFace: THEME.headFontFace, fontSize: 18 })
    text(s, d, { x: x + 0.28, y: 4.2, w: 2.38, h: 1.6, fontSize: 14, color: C.accent6 })
    text(s, `Pour : ${who}`, { x: x + 0.28, y: 5.9, w: 2.4, h: 0.35, fontSize: 12, color: C.accent1, bold: true })
  })

  /* 11 — Boucle */
  s = content('Solution', '08 · Comment ça marche', 'Du signalement d\'un habitant à l\'alerte qui sauve un quartier', 'Le score de risque est recalculé à chaque nouvelle prévision SODEXAM et à chaque signalement validé.')
  const flow = [
    [I.phone, 'Signalement', 'Photo et GPS par WhatsApp ou USSD'],
    [I.scan, 'Vérification', 'IA (doublons, EXIF, géofence) et brigade'],
    [I.map, 'Score de risque', 'Îlot de 250 m, actualisé chaque heure'],
    [I.truck, 'Curage', 'Ordre de mission, preuve photo'],
    [I.bell, 'Alerte', 'Géociblée, multilingue, accusé de réception'],
  ]
  const fw = 2.22, gap = 0.25
  flow.forEach(([ic, t, d], i) => {
    const x = M + i * (fw + gap)
    beat('float', 280)
    card(s, x, 2.05, fw, 2.5)
    iconCircle(s, ic, x + (fw - 0.7) / 2, 2.3, 0.7)
    text(s, t, { x: x + 0.15, y: 3.15, w: fw - 0.3, h: 0.4, align: 'center', fontFace: THEME.headFontFace, fontSize: 17 })
    text(s, d, { x: x + 0.2, y: 3.6, w: fw - 0.4, h: 0.85, align: 'center', fontSize: 13, color: C.accent6 })
    if (i < flow.length - 1) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + fw + 0.02, y: 3.17, w: 0.21, h: 0.26, fill: { color: HEX.water }, line: { color: HEX.water, width: 0 }, objectName: reg(id('fleche'), 'wipe-right') })
  })
  beat('wipe-right', 350, 1000)
  card(s, M, 4.85, 12.1, 1.45, { fill: HEX.water, transparency: 90, line: HEX.water })
  text(s, 'SCORE DE RISQUE', { x: M + 0.35, y: 5.05, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2 })
  text(s, 'risque = pluie prévue × obstruction × pente × population exposée', { x: M + 0.35, y: 5.4, w: 11.4, h: 0.6, fontFace: 'Courier New', fontSize: 17, color: C.background2 })

  /* 12 — Démo du site */
  s = content('Solution', '09 · Démo', 'Un site et un prototype interactif déjà en ligne', 'Captures réelles du site, recette automatisée Playwright et Lighthouse du 22 octobre 2026.')
  const shotA = path.join(CAPTURES, 'desktop-07-prototype.png')
  const shotB = path.join(CAPTURES, 'desktop-01-hero.png')
  beat('zoom', 0, 900)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M - 0.04, y: 1.86, w: 7.38, h: 4.62, rectRadius: 0.08, fill: { color: HEX.line }, line: { color: HEX.line, width: 0 }, objectName: reg('cadre-demo') })
  s.addImage({ path: shotA, x: M, y: 1.9, w: 7.3, h: 4.5625, objectName: reg('capture-prototype') })
  beat('float', 400)
  s.addImage({ path: shotB, x: 8.25, y: 1.9, w: 4.45, h: 2.78, objectName: reg('capture-hero') })
  beat('fade', 300)
  text(s, [{ text: 'pethuelelie-glitch.github.io/kanivo', options: { hyperlink: { url: 'https://pethuelelie-glitch.github.io/kanivo/' }, color: C.accent1, bold: true } }], { x: 8.25, y: 4.85, w: 4.45, h: 0.35, fontSize: 15 })
  beat('fade', 200)
  text(s, [
    { text: 'Simulateur de pluie sur les 13 communes', options: { bullet: true, breakLine: true } },
    { text: 'Comparaison sans et avec Kanivo', options: { bullet: true, breakLine: true } },
    { text: 'Lighthouse desktop : 100 / 100 / 100 / 100', options: { bullet: true } },
  ], { x: 8.25, y: 5.3, w: 4.45, h: 1.2, fontSize: 14, color: C.background2, paraSpaceAfter: 4 })

  /* 13 — Simulation */
  s = content('Solution', '10 · Ce que montre le simulateur', 'Lors d\'un épisode extrême, l\'alerte change l\'ordre de grandeur', 'Modèle illustratif et non calibré du prototype : 210 mm en 24 h, curage 15 % → 80 %, couverture d\'alerte 20 % → 75 %. À calibrer pendant le pilote.')
  beat('wipe-up', 0, 1200)
  s.addChart(pres.charts.BAR, [
    { name: 'Sans Kanivo', labels: ['Habitants exposés', 'Mis à l\'abri à temps'], values: [407474, 69271] },
    { name: 'Avec Kanivo', labels: ['Habitants exposés', 'Mis à l\'abri à temps'], values: [277614, 176978] },
  ], {
    x: M, y: 1.85, w: 7.6, h: 4.55, barDir: 'col', barGapWidthPct: 70, barOverlapPct: -10,
    chartColors: [HEX.orange, HEX.water], showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '# ##0',
    valAxisHidden: true, valGridLine: { style: 'none' }, showLegend: true, legendPos: 't', legendColor: HEX.text, legendFontSize: 12,
    showTitle: false, ...axis, dataLabelFontSize: 12, objectName: reg('graphique-simulation'),
  })
  const simK = [['11 → 2', 'communes en alerte rouge', C.accent2], ['× 2,6', 'personnes mises à l\'abri à temps', C.accent1], ['− 32 %', 'd\'habitants exposés grâce au curage préventif', C.background2]]
  simK.forEach(([v, l, col], i) => {
    const y = 1.95 + i * 1.47
    beat('float', i ? 220 : 450)
    card(s, 8.6, y, 4.1, 1.3)
    text(s, v, { x: 8.9, y: y + 0.18, w: 1.9, h: 0.9, valign: 'middle', fontFace: THEME.headFontFace, fontSize: 30, color: col })
    text(s, l, { x: 10.8, y: y + 0.18, w: 1.75, h: 0.9, valign: 'middle', fontSize: 14, color: C.accent6 })
  })

  /* 14 — Modèle économique */
  pres.addSection({ title: 'Déploiement' })
  s = content('Déploiement', '11 · Modèle économique', 'Financé par ceux qui supportent déjà le coût des inondations', 'Hypothèses de l\'équipe Kanivo, à valider pendant le pilote. Banque mondiale P168308 : 315 M$ (IDA).')
  const biz = [
    [I.landmark, 'SaaS public', 'District, ANAGED, 13 communes : carte de risque, ordres de mission, indicateurs.', '3 à 6 M FCFA par commune et par an'],
    [I.coins, 'Bailleurs', 'Une ligne « entretien et résilience » dans les projets de drainage (BM, BAD, AFD).', '1 à 2 % des enveloppes'],
    [I.shield, 'Assurance', 'API de risque hyperlocal pour la micro-assurance et l\'assurance paramétrique.', 'Accès API au volume'],
    [I.radio, 'Opérateurs télécoms', 'Diffusion des alertes d\'intérêt public en SMS et cell broadcast (RSE).', 'Canal à prix coûtant'],
  ]
  biz.forEach(([ic, t, d, tag], i) => {
    const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.25
    beat('float', 220)
    card(s, x, y, 5.95, 2.05)
    iconCircle(s, ic, x + 0.3, y + 0.3, 0.7)
    text(s, t, { x: x + 1.2, y: y + 0.3, w: 4.5, h: 0.45, fontFace: THEME.headFontFace, fontSize: 20 })
    text(s, d, { x: x + 1.2, y: y + 0.78, w: 4.5, h: 0.75, fontSize: 14, color: C.accent6 })
    text(s, tag, { x: x + 1.2, y: y + 1.55, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: C.accent2 })
  })

  /* 15 — Roadmap */
  s = content('Déploiement', '12 · Feuille de route', 'Opérationnel avant la saison des pluies 2027', 'Communes pilotes proposées : Attécoubé (glissements de Mossikro) et Abobo (1,34 M d\'habitants).')
  const steps = [
    ['Nov. 26 – Janv. 27', 'Cadrage', 'Convention ANAGED, 2 communes pilotes, données SODEXAM', 'Protocole signé'],
    ['Févr. – Avr. 27', 'Pilote Signal', 'Bot WhatsApp et USSD, 100 Brigades vertes', '≥ 5 000 signalements'],
    ['Avr. – Mai 27', 'Avant-saison', 'Carte de risque v1, curage priorisé', '≥ 80 % des points critiques curés'],
    ['Mai – Juil. 27', 'Saison', 'Alertes multilingues géociblées', 'Réception < 15 min, ≥ 70 % joints'],
    ['2028', 'Passage à l\'échelle', '13 communes, API assureurs, villes secondaires', 'Baisse mesurée des victimes'],
  ]
  const sw = 2.3, sg = 0.15
  beat('wipe-right', 0, 1400)
  s.addShape(pres.shapes.LINE, { x: M + 0.2, y: 2.3, w: 11.7, h: 0, line: { color: HEX.water, width: 1.5 }, objectName: reg('ligne-temps') })
  steps.forEach(([d, t, desc, kpi], i) => {
    const x = M + i * (sw + sg)
    beat('zoom', i ? 220 : 300, 500)
    s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: 2.17, w: 0.26, h: 0.26, fill: { color: i === 3 ? HEX.orange : HEX.ink }, line: { color: i === 3 ? HEX.orange : HEX.water, width: 1.5 }, objectName: reg(id('jalon')) })
    beat('float', 80)
    text(s, d.toUpperCase(), { x, y: 2.65, w: sw, h: 0.3, fontSize: 11, bold: true, color: C.accent1 })
    card(s, x, 3.05, sw, 3.3)
    text(s, t, { x: x + 0.22, y: 3.25, w: sw - 0.4, h: 0.75, fontFace: THEME.headFontFace, fontSize: 18 })
    text(s, desc, { x: x + 0.22, y: 4.0, w: sw - 0.4, h: 1.25, fontSize: 14, color: C.accent6 })
    text(s, kpi, { x: x + 0.22, y: 5.35, w: sw - 0.4, h: 0.8, fontSize: 13, bold: true, color: C.accent3 })
  })

  /* 16 — Impact */
  s = content('Déploiement', '13 · Impact visé', 'Quatre résultats mesurables dès la première saison', 'Objectifs à mesurer pendant le pilote. Référence : en 2026, l\'évacuation a évité des victimes là où les consignes ont été suivies (Gouvernement).')
  const imp = [
    [I.users, 'Vies', 'Moins de victimes dans les communes pilotes, grâce à l\'évacuation anticipée et au curage préventif.', 'Victimes et évacuations par épisode'],
    [I.build, 'Ouvrages', 'Préserver la capacité des ouvrages financés, qui représentent des centaines de millions de dollars.', 'Taux de points critiques curés avant le 15 mai'],
    [I.brief, 'Emplois', 'Environ 1 300 Brigades vertes à l\'échelle du district, soit 100 par commune.', 'Jeunes formés et rémunérés'],
    [I.trend, 'Gouvernance', 'Les premiers indicateurs publics d\'entretien du drainage, commune par commune.', 'Délai signalement → curage'],
  ]
  imp.forEach(([ic, t, d, kpi], i) => {
    const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.25
    beat('float', 220)
    card(s, x, y, 5.95, 2.05)
    iconCircle(s, ic, x + 0.3, y + 0.3, 0.7)
    text(s, t, { x: x + 1.2, y: y + 0.3, w: 4.5, h: 0.45, fontFace: THEME.headFontFace, fontSize: 20 })
    text(s, d, { x: x + 1.2, y: y + 0.78, w: 4.5, h: 0.75, fontSize: 14, color: C.accent6 })
    text(s, [{ text: 'Indicateur : ', options: { bold: true, color: C.accent1 } }, { text: kpi }], { x: x + 1.2, y: y + 1.55, w: 4.5, h: 0.35, fontSize: 13 })
  })

  /* 17 — Risques */
  s = content('Déploiement', '14 · Risques et parades', 'Les principaux risques sont humains, et ils sont maîtrisables', 'Cadre légal : loi n° 2013-450 relative à la protection des données à caractère personnel (ARTCI).')
  const prob = (p) => ({ text: p, options: { bold: true, color: p === 'Élevée' ? HEX.red : HEX.amber, align: 'center' } })
  const rk = [
    ['Faible adoption citoyenne', 'Moyenne', 'USSD, SMS et vocal sans smartphone ; chefs de quartier relais ; récompense'],
    ['Fraude au signalement', 'Élevée', 'Contrôle IA (doublons, EXIF, géofence), audits aléatoires, plafonds'],
    ['Signalements sans suite, perte de confiance', 'Élevée', 'Indicateurs publics, délais garantis, prestataires payés au résultat'],
    ['Accès aux données météo', 'Moyenne', 'Convention SODEXAM ; à défaut, données satellite ouvertes (GPM/IMERG)'],
    ['Données personnelles', 'Moyenne', 'Minimisation, anonymisation des signaleurs, analyse d\'impact'],
    ['Lassitude face aux fausses alertes', 'Moyenne', 'Seuils calibrés, niveaux gradués, retour d\'expérience après chaque épisode'],
  ]
  beat('wipe-down', 0, 1200)
  s.addTable([[hdr('Risque'), { ...hdr('Probabilité'), options: { ...hdr('').options, align: 'center' } }, hdr('Parade')], ...rk.map(([a, b, c]) => [{ text: a, options: { bold: true, color: HEX.text } }, prob(b), { text: c, options: { color: HEX.muted } }])], {
    x: M, y: 1.9, w: 12.1, colW: [3.9, 1.6, 6.6], fontSize: 14, fontFace: 'Calibri', color: HEX.text,
    border: { type: 'solid', pt: 0.5, color: HEX.line }, fill: { color: HEX.ink }, rowH: 0.62, valign: 'middle', margin: [0.05, 0.14, 0.05, 0.14], objectName: reg('tableau-risques'),
  })

  /* 18 — Équipe et prochaines étapes */
  pres.addSection({ title: 'Conclusion' })
  s = content('Conclusion', '15 · Équipe et prochaines étapes', 'Une équipe resserrée et trois décisions pour lancer le pilote', 'Équipe cible pour le pilote de 6 mois ; profils à recruter ou à mettre à disposition par les partenaires.')
  beat('float')
  card(s, M, 1.95, 5.2, 4.4)
  text(s, 'Équipe cible du pilote', { x: M + 0.3, y: 2.15, w: 4.6, h: 0.45, fontFace: THEME.headFontFace, fontSize: 20, color: C.accent1 })
  text(s, [
    { text: 'Direction de projet et relations institutionnelles', options: { bullet: true, breakLine: true } },
    { text: 'Product manager et designer de service', options: { bullet: true, breakLine: true } },
    { text: '2 ingénieurs (USSD, WhatsApp, web, données)', options: { bullet: true, breakLine: true } },
    { text: 'Data scientist (score de risque, vision)', options: { bullet: true, breakLine: true } },
    { text: 'Coordination terrain et 100 Brigades vertes', options: { bullet: true, breakLine: true } },
    { text: 'Référents ANAGED, ONPC et communes', options: { bullet: true } },
  ], { x: M + 0.3, y: 2.75, w: 4.65, h: 3.4, fontSize: 15, color: C.background2, paraSpaceAfter: 14 })
  const nx = [
    ['30 j', 'Valider le cadrage avec l\'ANAGED, l\'ONPC et les mairies d\'Attécoubé et d\'Abobo.'],
    ['60 j', 'Signer l\'accès aux données SODEXAM et le canal SMS avec un opérateur.'],
    ['90 j', 'Lancer le bot Signal et recruter les 100 premières Brigades vertes.'],
  ]
  nx.forEach(([k, d], i) => {
    const y = 1.95 + i * 1.15
    beat('float', 250)
    card(s, 6.05, y, 6.65, 1.0)
    badge(s, 6.3, y + 0.2, k, i === 2 ? C.accent2 : C.accent1, 0.6)
    text(s, d, { x: 7.15, y, w: 5.35, h: 1.0, valign: 'middle', fontSize: 15 })
  })
  beat('wipe-right', 350)
  card(s, 6.05, 5.45, 6.65, 0.9, { fill: HEX.orange, transparency: 88, line: HEX.orange })
  text(s, [{ text: 'Décisions demandées : ', options: { bold: true, color: C.accent2 } }, { text: 'mandat de pilote, communes pilotes, budget de lancement.' }], { x: 6.35, y: 5.45, w: 6.2, h: 0.9, valign: 'middle', fontSize: 15 })

  /* 19 — Sources */
  s = content('Conclusion', 'Annexe', 'Sources principales', 'Liste complète et commentée : livrable/rapport-analyse.md du dépôt github.com/pethuelelie-glitch/kanivo')
  const src = [
    'Gouvernement via Fratmat/AllAfrica : 59 morts, pluies du 28-29 juin 2026 (1er juil. 2026)',
    'Le360 Afrique et AllAfrica : bilan ONPC, 24 morts, pluies du 13 au 22 juin 2024',
    'RTBF et Vatican News : 18 morts, nuit du 18 au 19 juin 2018',
    'Banque mondiale : Urban Resilience and Solid Waste Management Project (P168308)',
    'GFDRR : City Scan Abidjan et PDNA 2018',
    'UNDRR : profil de risque et de résilience de la Côte d\'Ivoire',
    'AllAfrica : 5 000 t de déchets par jour, Ministère de la Salubrité (mars 2026)',
    'ONU-Habitat : profil urbain d\'Abidjan (données ANASUR 2016)',
    'INS, RGPH 2021 (via economie-ivoirienne.ci et citypopulation.de)',
    'DG Trésor : FASEP vigilance météorologique à Abidjan (2022)',
    'DataReportal 2026 via Digital Mag CI : usages du mobile',
    'BAD : PAACA (2021) et bassin versant du Gourou ; AIP ; GWP (2023)',
  ]
  const half = Math.ceil(src.length / 2)
  ;[src.slice(0, half), src.slice(half)].forEach((col, j) => {
    beat('fade', 300, 800)
    text(s, col.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < col.length - 1 } })), { x: M + j * 6.15, y: 1.95, w: 5.85, h: 4.5, fontSize: 14, color: C.background2, paraSpaceAfter: 12 })
  })

  await pres.writeFile({ fileName: OUT })
  await applyTheme(OUT, THEME)
  const st = await applyMotion(OUT, motion.plan)
  console.log('OK', OUT, `${st.slides} slides animées, ${st.effects} effets`)
}

build().catch((e) => { console.error(e); process.exit(1) })
