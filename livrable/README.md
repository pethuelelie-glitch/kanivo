# Livrable — Kanivo

> **Sujet :** les inondations meurtrières d'Abidjan, aggravées par des caniveaux bouchés, des alertes qui n'atteignent pas les quartiers et des zones à risque réoccupées.
> **Proposition :** *Kanivo*, plateforme citoyenne et prédictive : signaler, prioriser, prévenir.

## Liens

| | |
|---|---|
| 🌐 **Site en ligne** | <https://pethuelelie-glitch.github.io/kanivo/> |
| 💻 **Dépôt GitHub** | <https://github.com/pethuelelie-glitch/kanivo> |
| ⚙️ **Déploiement continu** | <https://github.com/pethuelelie-glitch/kanivo/actions> |

## Contenu du dossier

| Élément | Fichier |
|---|---|
| **Deck PowerPoint** (19 slides, niveau conseil, transitions Morph et 284 animations) | [`Kanivo-Inondations-Abidjan.pptx`](Kanivo-Inondations-Abidjan.pptx) |
| Deck exporté en PDF | [`Kanivo-Inondations-Abidjan.pdf`](Kanivo-Inondations-Abidjan.pdf) |
| Aperçu des slides (PNG) | [`deck-apercu/`](deck-apercu/) |
| **Rapport d'analyse** (chiffres, causes, acteurs, solution, 18 sources) | [`rapport-analyse.md`](rapport-analyse.md) |
| **Guide d'installation** (dev, build, recette, deck, déploiement) | [`guide-installation.md`](guide-installation.md) |
| **Résultats de tests** (Playwright, Lighthouse, deck, correctifs) | [`resultats-tests.md`](resultats-tests.md) |
| Résultats bruts (JSON) et rapports Lighthouse (HTML) | [`tests/`](tests/) |
| **Captures d'écran** locales (desktop, mobile, reduced-motion) | [`captures/`](captures/) |
| Captures du site en ligne | [`captures/en-ligne/`](captures/en-ligne/) |
| **Projet** (sources du site, du deck et des tests) | la racine du dépôt, et l'archive [`kanivo-projet.zip`](kanivo-projet.zip) |

## En bref

- **Le problème :** 59 morts après les pluies du 28-29 juin 2026 ; 24 en juin 2024 ; 18 en juin 2018. Plus de 26 % du district est exposé, et environ 5 000 t de déchets sont produites chaque jour.
- **Pourquoi ça échoue :** le drainage est obstrué et curé après coup, la ville grandit plus vite que le plan, les sites évacués sont réoccupés, et l'alerte s'arrête avant le dernier kilomètre. Les acteurs (SODEXAM, ONPC, ANAGED, communes, bailleurs) travaillent en silos.
- **Kanivo :** Signal (WhatsApp, USSD, web) → score de risque par îlot de 250 m → curage priorisé avec preuve photo → alerte géociblée multilingue avec accusé de réception.
- **Modèle économique :** SaaS public, ligne « entretien » dans les projets des bailleurs, API pour l'assurance, partenariat avec les opérateurs télécoms.
- **Feuille de route :** pilote à Attécoubé et Abobo, opérationnel avant le 15 mai 2027.

## Qualité

| | Résultat |
|---|---|
| Lighthouse desktop | 100 / 100 / 100 / 100 |
| Lighthouse mobile (4G simulée) | 85 / 100 / 100 / 100 |
| Erreurs console (local et en ligne, 3 profils) | 0 |
| Débordement horizontal (390 à 1440 px) | aucun |
| Deck : validation OOXML et relecture visuelle | ✅ |
| Deck : transitions et animations relues par LibreOffice (19/19 slides) | ✅ |
