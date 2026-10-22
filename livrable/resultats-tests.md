# Résultats des tests — 22 octobre 2026

## Synthèse

| Contrôle | Local (`vite preview`) | En ligne (GitHub Pages) |
|---|---|---|
| Build de production (`vite build`) | ✅ en < 1 s, 56 Ko de JS gzip, 8 Ko de CSS gzip | ✅ via GitHub Actions |
| Erreurs console (desktop, mobile, reduced-motion) | ✅ 0 | ✅ 0 |
| Requêtes en échec | ✅ 0 | ✅ 0 |
| Débordement horizontal (390 px, 1280 px, 1440 px) | ✅ aucun | ✅ aucun |
| Simulateur : boutons, curseurs, mode « avec / sans » | ✅ | ✅ |
| Carte au clavier (Tab puis Entrée sur une commune) | ✅ | ✅ |
| Module Signal (formulaire local) | ✅ | ✅ |
| `prefers-reduced-motion` : contenu lisible, chronologie défilable | ✅ | ✅ |
| Lighthouse desktop | **100 / 100 / 100 / 100** | — |
| Lighthouse mobile (4G simulée) | **85 / 100 / 100 / 100** | — |
| Deck : validation OOXML | ✅ toutes les validations passent | — |

Scores Lighthouse dans l'ordre : Performance, Accessibilité, Bonnes pratiques, SEO.

## 1. Recette automatisée (Playwright)

Script : [`scripts/qa.mjs`](../scripts/qa.mjs). Résultats bruts : [`tests/qa-results.json`](tests/qa-results.json) (local) et [`tests/qa-results-en-ligne.json`](tests/qa-results-en-ligne.json) (en ligne).

| Parcours | Viewport | Erreurs | Débordement | Titres (h1 / total) | Communes rendues |
|---|---|---|---|---|---|
| Desktop | 1440 × 900 | 0 | non | 1 / 31 | 13 |
| Mobile (tactile, DPR 2) | 390 × 844 | 0 | non | 1 / 31 | 13 |
| Reduced motion | 1280 × 800 | 0 | non | 1 / 31 | 13 |

**Simulateur, scénario extrême (210 mm en 24 h) :**

| Indicateur | Sans Kanivo (curage 15 %, alerte 20 %) | Avec Kanivo (curage 80 %, alerte 75 %) |
|---|---|---|
| Habitants exposés | 407 474 | 277 614 |
| Mis à l'abri à temps | 69 271 | 176 978 |
| Communes en alerte rouge | 11 | 2 |

> Modèle illustratif, non calibré. Il sert à montrer la logique de décision, pas à prédire un bilan.

## 2. Lighthouse

Rapports HTML complets : [`tests/lighthouse-desktop.report.html`](tests/lighthouse-desktop.report.html) et [`tests/lighthouse-mobile.report.html`](tests/lighthouse-mobile.report.html).

| Profil | Perf. | A11y | BP | SEO | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Desktop | 100 | 100 | 100 | 100 | 0,5 s | 0,6 s | 0,034 | 0 ms |
| Mobile | 85 | 100 | 100 | 100 | 2,6 s | 3,0 s | 0 | 270 ms |

## 3. Problèmes trouvés et corrigés

| # | Constat | Correction | Commit |
|---|---|---|---|
| 1 | La carte du simulateur n'était pas animée (initialisée après ScrollTrigger) | Initialisation du prototype avant les animations | `fix(motion)` |
| 2 | Le modèle de risque passait 7 communes au rouge dès 110 mm | Recalibrage (seuil de 220 mm effectifs) | `fix(prototype)` |
| 3 | La navigation apparaissait coupée en haut (conflit de transform CSS et GSAP) | Intro de la nav en opacité seule | `fix(motion)` |
| 4 | Mobile : le téléphone collant recouvrait le texte des modules | Téléphone réduit par `zoom`, sur un bandeau opaque | `fix(mobile)` |
| 5 | Lighthouse desktop à 76 : CLS de 0,47 causé par le chargement des polices | Polices auto-hébergées, héros révélé une fois les polices prêtes | `perf` |
| 6 | Contraste insuffisant des modules inactifs (opacité 0,28) | Atténuation par la couleur (contraste ≥ 4,5:1) | `perf` |
| 7 | Libellés ARIA de la carte ne contenant pas le texte visible | Libellé « Commune score sur 100, niveau… » | `a11y` |
| 8 | `robots.txt` absent (SEO 91) | Ajout de `public/robots.txt` | `seo` |
| 9 | Preload des polices testé : FCP mobile dégradé (85 → 72) | Preload retiré, mesure documentée | `perf` |
| 10 | Cellules de la section Masterclass mal alignées | `align-content: start` | `fix(style)` |
| 11 | L'onglet de navigation actif restait allumé hors de sa section | Suivi de l'ensemble des sections visibles | `fix(nav)` |

## 4. Vérifications manuelles

- Navigation dans le navigateur intégré de l'application Claude (desktop 1440 × 900) : héros, statistiques, chronologie épinglée, causes, silos, téléphone synchronisé, simulateur.
- Relecture visuelle de toutes les captures dans [`captures/`](captures/) et [`captures/en-ligne/`](captures/en-ligne/).

## 5. Deck PowerPoint

| Contrôle | Résultat |
|---|---|
| Validation OOXML (schéma, relations, types de contenu, graphiques) | ✅ toutes les validations passent |
| Rendu LibreOffice 26.8 → PDF → PNG, relecture des 19 slides | ✅ après correctifs (voir ci-dessous) |
| Thème appliqué (palette « Kanivo Nuit », Cambria et Calibri) | ✅ vérifié dans `ppt/theme/theme1.xml` |
| Graphiques | ✅ natifs et modifiables dans PowerPoint (3 graphiques) |

Défauts trouvés au premier rendu, puis corrigés :

1. Titres centrés par défaut : alignés à gauche, conformément à la grille.
2. Deux titres sur deux lignes empiétaient sur le contenu (slides 8 et 10) : reformulés sur une ligne.
3. Deux intitulés de cause passaient sur deux lignes et chevauchaient le texte (slide 6) : raccourcis.
4. La formule du score de risque passait sur deux lignes (slide 11) : condensée.
5. « 70 » séparé de « % » en fin de ligne (slide 15) : espaces insécables automatiques entre chiffres et unités.
6. Graphique d'exposition en ordre inversé (slide 5) : catégories réordonnées.
7. Capture de démo cadrée sur le titre au lieu de la carte (slide 12) : remplacée par la capture du prototype.
8. Annexe des sources trop dense pour l'espace disponible (slide 19) : corps de texte agrandi.

Aperçus : [`deck-apercu/`](deck-apercu/). Export PDF : [`Kanivo-Inondations-Abidjan.pdf`](Kanivo-Inondations-Abidjan.pdf).
