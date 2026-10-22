# Kanivo — À Abidjan, la pluie ne tue pas seule

**Site en ligne :** <https://pethuelelie-glitch.github.io/kanivo/>
**Deck :** [`livrable/Kanivo-Inondations-Abidjan.pptx`](livrable/Kanivo-Inondations-Abidjan.pptx) (transitions Morph et animations d'entrée)
**Rapport d'analyse sourcé :** [`livrable/rapport-analyse.md`](livrable/rapport-analyse.md)

Dans la nuit du 28 au 29 juin 2026, des pluies diluviennes ont fait **59 morts** à Abidjan (bilan du Gouvernement, 1er juillet 2026). Le même scénario revient chaque saison : 18 morts en 2018, 24 en 2024. Et il s'aggrave. Les causes sont connues : caniveaux bouchés par les déchets (environ 5 000 t produites chaque jour), urbanisation des bas-fonds, sites évacués puis réoccupés, et des alertes qui n'atteignent pas les quartiers.

**Kanivo** est une plateforme citoyenne et prédictive qui relie les trois maillons aujourd'hui séparés :

| Module | Rôle |
|---|---|
| **Signal** | Signalement d'un caniveau obstrué en 20 secondes (WhatsApp, USSD `*700#`, web), vérifié par IA |
| **Carte de risque** | Score par îlot de 250 m : `pluie prévue × obstruction × pente × population exposée` |
| **Curage priorisé** | Ordres de mission classés par risque, preuve photo, paiement au résultat |
| **Alerte dernier kilomètre** | SMS, vocal (dioula, baoulé, nouchi, français), WhatsApp et *cell broadcast*, avec accusé de réception |

## Le site

Une page « masterclass » qui raconte le problème, l'analyse et la solution, avec un **prototype interactif** : faites pleuvoir sur les 13 communes, réglez le curage et la couverture d'alerte, comparez les scénarios « sans » et « avec » Kanivo, et testez le module Signal.

- **Stack :** Vite 8, JavaScript sans framework, [GSAP 3](https://gsap.com) + ScrollTrigger, [Lenis](https://lenis.darkroom.engineering/), canvas 2D (pluie) et SVG (carte)
- **Motion :** titres révélés mot à mot, pluie qui s'intensifie au défilement, montée des eaux, chronologie épinglée en défilement horizontal, téléphone collant synchronisé avec les modules, compteurs, carte animée
- **Accessibilité :** HTML sémantique, lien d'évitement, focus visible, carte utilisable au clavier, `aria-live` sur les indicateurs, respect de `prefers-reduced-motion`
- **Performance :** polices auto-hébergées, aucun décalage de mise en page (CLS 0), pluie démarrée en *idle* et mise en pause hors écran

| Lighthouse (22/10/2026) | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Desktop | **100** | **100** | **100** | **100** |
| Mobile (4G simulée) | 85 | **100** | **100** | **100** |

## Démarrer

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # génère dist/
npm run preview   # sert dist/ sur http://localhost:4173
npm run qa        # recette Playwright (nécessite npm run preview en parallèle)
npm run deck      # régénère le PowerPoint dans livrable/
```

Le guide détaillé est dans [`livrable/guide-installation.md`](livrable/guide-installation.md).

## Présentation automatique et recette commentée

`visite/guide.py` prend la main sur l'ordinateur. Il ouvre Edge ou Chrome en plein écran, puis déplace **le vrai curseur de Windows** comme le ferait une personne : trajets en courbe, défilement à la molette par à-coups, pauses de lecture. Il présente chaque section à voix haute, avec une voix neuronale française (Denise). À défaut, il utilise la voix du navigateur ou celle de Windows. Le texte s'affiche aussi dans une bulle à l'écran.

Il **teste lui-même** chaque fonction et coche en direct une liste de recette de 20 contrôles :
- chargement, pluie animée, compteurs, frise épinglée, téléphone synchronisé ;
- les 4 réglages du simulateur, la carte à la souris et au clavier, le module Signal ;
- sources, débordement, menu, retour en haut, lien d'évitement, console JavaScript ;
- la version mobile.

À la fin, il propose **« À vous de jouer »** : 5 missions vérifiées en direct (« Montre-moi » si vous bloquez), puis un quiz de 5 questions. Les bilans (JSON et capture) sont enregistrés dans `visite/resultats/`.

```bash
pip install -r visite/requirements.txt
python visite/guide.py                 # site en ligne, plein écran, voix
python visite/guide.py --local         # serveur de dev (npm run dev)
python visite/guide.py --a-vous        # directement aux missions et au quiz
python visite/guide.py --fenetre --souris-virtuelle --vitesse 1.5
python visite/guide.py --help          # toutes les options (--muet, --voix, --sans-mobile, --auto…)
```

Pas de son ? Vérifiez le volume et la sortie audio par défaut de Windows. Vous pouvez aussi forcer une autre voix avec `--voix navigateur` ou `--voix windows`. Pour quitter le plein écran, appuyez sur F11. Pour arrêter, fermez le navigateur ou faites Ctrl+C dans le terminal.

## Structure

```text
index.html               page unique, 10 sections sémantiques
src/main.js              motion (GSAP, ScrollTrigger, Lenis), pluie canvas, navigation
src/sim.js               modèle de risque illustratif et prototype interactif
src/data.js              13 communes (population RGPH 2021, indices illustratifs)
src/style.css            système visuel et responsive
scripts/qa.mjs           recette automatisée (desktop, mobile, reduced-motion)
visite/guide.py          visite guidée « humaine » puis missions et quiz (Python, Playwright)
deck/build-deck.cjs      générateur du PowerPoint (pptxgenjs)
deck/motion.cjs          transitions et animations réelles injectées dans l'OOXML
.github/workflows/       déploiement continu sur GitHub Pages
livrable/                deck, rapport, guide, résultats de tests, captures
```

## Avertissement

Kanivo est un concept. Les populations proviennent du RGPH 2021, mais les indices de vulnérabilité et d'obstruction du simulateur sont **illustratifs**, et les hypothèses économiques et d'impact restent **à valider pendant un pilote**. Toutes les sources sont listées dans le rapport.

---

Conçu et réalisé de bout en bout avec Claude Opus 5.5 : recherche, analyse, deck, site, tests et déploiement.
