// Moteur de mise en mouvement pour decks pptxgenjs : transitions et animations réelles (OOXML).
// pptxgenjs n'écrit ni <p:transition> ni <p:timing> : on chorégraphie pendant la construction,
// puis on injecte le XML dans chaque slide après writeFile().
//
//   const motion = createMotion()
//   motion.slide('morph')            // à chaque addSlide : 'morph' | 'fade' | 'push' | 'none'
//   motion.beat('float', 200)        // ouvre un temps : tout ce qui est enregistré ensuite entre ensemble
//   motion.reg('nom-objet')          // objectName de la forme à animer (unique dans la slide),
//                                    // ou 'ph-N' pour le N-ième placeholder de la slide
//   await applyMotion('deck.pptx', motion.plan)
//
// Effets : fade, float (Float In), zoom, wipe-right, wipe-up, wipe-down, wipe-left.
const fs = require('fs')

function createMotion() {
  const plan = []
  let cur = null
  return {
    plan,
    slide(transition = 'morph') {
      cur = { transition, beats: [], t: 0 }
      plan.push(cur)
    },
    beat(fx = 'float', gap = 200, dur) {
      const at = cur.beats.length ? cur.t + gap : 150
      cur.t = at
      cur.beats.push({ fx, at, dur: dur || DUR[fx] || 700, items: [] })
    },
    reg(name, fx) {
      if (cur && cur.beats.length) cur.beats[cur.beats.length - 1].items.push({ name, fx })
    },
  }
}

const DUR = { fade: 600, float: 750, zoom: 600, 'wipe-right': 800, 'wipe-left': 800, 'wipe-up': 900, 'wipe-down': 800 }
const WIPE = { 'wipe-down': [1, 'wipe(down)'], 'wipe-left': [2, 'wipe(left)'], 'wipe-up': [4, 'wipe(up)'], 'wipe-right': [8, 'wipe(right)'] }

function effectXml(fx, spid, delay, dur, nextId) {
  const tgt = `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`
  const show = `<p:set><p:cBhvr><p:cTn id="${nextId()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${tgt}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`
  const fade = `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${nextId()}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>`
  const anim = (attr, from, to, isNum) =>
    `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${nextId()}" dur="${dur}" decel="100000" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val>${isNum ? `<p:fltVal val="${from}"/>` : `<p:strVal val="${from}"/>`}</p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`
  let preset, sub = 0, body
  if (fx === 'fade') { preset = 10; body = show + fade }
  else if (fx === 'float') { preset = 42; body = show + fade + anim('ppt_x', '#ppt_x', '#ppt_x') + anim('ppt_y', '#ppt_y+.06', '#ppt_y') }
  else if (fx === 'zoom') { preset = 53; sub = 16; body = show + anim('ppt_w', 0, '#ppt_w', true) + anim('ppt_h', 0, '#ppt_h', true) + fade }
  else if (WIPE[fx]) { preset = 22; sub = WIPE[fx][0]; body = show + `<p:animEffect transition="in" filter="${WIPE[fx][1]}"><p:cBhvr><p:cTn id="${nextId()}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>` }
  else throw new Error(`Effet inconnu : ${fx}`)
  return { preset, sub, body }
}

function transitionXml(kind) {
  if (kind === 'none') return ''
  if (kind === 'fade') return '<p:transition spd="slow"><p:fade/></p:transition>'
  if (kind === 'push') return '<p:transition spd="slow"><p:push dir="u"/></p:transition>'
  if (kind === 'morph') {
    return '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">' +
      '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">' +
      '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="1200"><p159:morph option="byObject"/></p:transition>' +
      '</mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
  }
  throw new Error(`Transition inconnue : ${kind}`)
}

// pptxgenjs ignore objectName sur les placeholders : on les renomme ph-1, ph-2… dans l'ordre du document.
function namePlaceholders(xml) {
  let k = 0
  return xml.replace(/<p:sp><p:nvSpPr><p:cNvPr id="(\d+)" name="[^"]*">((?:(?!<\/p:nvSpPr>)[\s\S])*?<p:ph[\s/>])/g, (_, id, rest) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="ph-${++k}">${rest}`)
}

// Repère pour chaque objectName son id et le type d'élément (sp, pic, graphicFrame, cxnSp).
function shapeIndex(xml) {
  const map = new Map()
  const re = /<p:(sp|pic|graphicFrame|cxnSp)>\s*<p:nv(?:Sp|Pic|GraphicFrame|CxnSp)Pr>\s*<p:cNvPr id="(\d+)" name="([^"]*)"/g
  let m
  while ((m = re.exec(xml))) {
    map.set(m[3], map.has(m[3]) ? { dup: true } : { kind: m[1], id: m[2] })
  }
  return map
}

function timingXml(slide, index) {
  let id = 2
  const nextId = () => ++id
  const effects = []
  const builds = new Map()
  for (const beat of slide.beats) {
    for (const item of beat.items) {
      const shape = index.get(item.name)
      if (!shape) throw new Error(`Objet introuvable pour l'animation : ${item.name}`)
      if (shape.dup) throw new Error(`Nom d'objet en double dans la slide : ${item.name}`)
      const fx = item.fx || beat.fx
      const ctnId = nextId()
      const { preset, sub, body } = effectXml(fx, shape.id, beat.at, beat.dur, nextId)
      effects.push(`<p:par><p:cTn id="${ctnId}" presetID="${preset}" presetClass="entr" presetSubtype="${sub}" fill="hold" grpId="0" nodeType="withEffect"><p:stCondLst><p:cond delay="${beat.at}"/></p:stCondLst><p:childTnLst>${body}</p:childTnLst></p:cTn></p:par>`)
      if (shape.kind === 'sp') builds.set(shape.id, `<p:bldP spid="${shape.id}" grpId="0" animBg="1"/>`)
      else if (shape.kind === 'graphicFrame') builds.set(shape.id, `<p:bldGraphic spid="${shape.id}" grpId="0"><p:bldAsOne/></p:bldGraphic>`)
    }
  }
  if (!effects.length) return ''
  // Un seul groupe, déclenché automatiquement à l'arrivée sur la slide (après la transition).
  const groupId = nextId(), innerId = nextId()
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
    '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' +
    `<p:par><p:cTn id="${groupId}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="${innerId}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects.join('')}</p:childTnLst></p:cTn></p:par>` +
    '</p:childTnLst></p:cTn></p:par>' +
    '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>' +
    `</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>${[...builds.values()].join('')}</p:bldLst></p:timing>`
}

async function applyMotion(file, plan) {
  const JSZip = require('jszip')
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  const stats = { slides: 0, effects: 0 }
  for (let i = 0; i < plan.length; i++) {
    const part = `ppt/slides/slide${i + 1}.xml`
    let xml = namePlaceholders(await zip.file(part).async('string'))
    const extra = transitionXml(plan[i].transition) + timingXml(plan[i], shapeIndex(xml))
    if (!xml.includes('</p:clrMapOvr>')) throw new Error(`${part} : <p:clrMapOvr> absent`)
    xml = xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${extra}`)
    zip.file(part, xml)
    stats.slides++
    stats.effects += plan[i].beats.reduce((n, b) => n + b.items.length, 0)
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
  return stats
}

module.exports = { createMotion, applyMotion }
