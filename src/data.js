// Population : INS, RGPH 2021 (via citypopulation.de) — total district 6 321 017.
// vuln : indice de vulnérabilité ILLUSTRATIF (pentes, bas-fonds, habitat précaire),
// obs  : obstruction de base des caniveaux ILLUSTRATIVE. À calibrer lors du pilote.
// x, y : position schématique sur la carte (nord en haut), pas une géographie exacte.
export const COMMUNES = [
  { id: 'anyama', name: 'Anyama', pop: 389592, x: 395, y: 52, vuln: 0.55, obs: 0.55 },
  { id: 'abobo', name: 'Abobo', pop: 1340083, x: 410, y: 138, vuln: 0.82, obs: 0.72 },
  { id: 'songon', name: 'Songon', pop: 89778, x: 70, y: 262, vuln: 0.4, obs: 0.4 },
  { id: 'yopougon', name: 'Yopougon', pop: 1571065, x: 205, y: 232, vuln: 0.74, obs: 0.66 },
  { id: 'attecoube', name: 'Attécoubé', pop: 313135, x: 318, y: 252, vuln: 0.96, obs: 0.78 },
  { id: 'adjame', name: 'Adjamé', pop: 340892, x: 405, y: 226, vuln: 0.7, obs: 0.74 },
  { id: 'plateau', name: 'Plateau', pop: 7186, x: 418, y: 300, vuln: 0.3, obs: 0.35 },
  { id: 'cocody', name: 'Cocody', pop: 692583, x: 548, y: 214, vuln: 0.66, obs: 0.58 },
  { id: 'bingerville', name: 'Bingerville', pop: 204656, x: 718, y: 236, vuln: 0.46, obs: 0.48 },
  { id: 'treichville', name: 'Treichville', pop: 106552, x: 420, y: 372, vuln: 0.42, obs: 0.6 },
  { id: 'marcory', name: 'Marcory', pop: 214061, x: 510, y: 380, vuln: 0.48, obs: 0.6 },
  { id: 'koumassi', name: 'Koumassi', pop: 412282, x: 600, y: 372, vuln: 0.62, obs: 0.7 },
  { id: 'portbouet', name: 'Port-Bouët', pop: 618795, x: 545, y: 462, vuln: 0.6, obs: 0.62 },
]

export const SCENARIOS = {
  ordinaire: { rain: 45, label: 'Averse ordinaire' },
  forte: { rain: 110, label: 'Forte pluie' },
  extreme: { rain: 210, label: 'Épisode extrême' },
}
