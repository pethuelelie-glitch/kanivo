# Guide d'installation

## Prérequis

| Outil | Version testée | Usage |
|---|---|---|
| Node.js | 22.x | build, serveur de développement, deck |
| npm | 11.x | dépendances |
| Git | 2.x | cloner le dépôt |
| (optionnel) navigateurs Playwright | Chromium | recette automatisée (`npx playwright install chromium`) |
| (optionnel) LibreOffice | 26.x | convertir le deck en PDF ou en images pour le relire |

## 1. Récupérer le projet

```bash
git clone https://github.com/pethuelelie-glitch/kanivo.git
cd kanivo
npm install
```

## 2. Lancer le site en local

```bash
npm run dev
```

Ouvrez <http://localhost:5173>. Les modifications de `index.html` et de `src/` sont rechargées à chaud.

## 3. Construire la version de production

```bash
npm run build      # produit dist/ (≈ 56 Ko de JS gzip, 8 Ko de CSS gzip, plus les polices)
npm run preview    # sert dist/ sur http://localhost:4173
```

Le build utilise une `base` relative (`./`). Le même `dist/` fonctionne donc à la racine d'un domaine comme dans un sous-dossier (GitHub Pages : `/kanivo/`).

## 4. Lancer la recette automatisée

Dans un premier terminal :

```bash
npm run preview
```

Dans un second terminal :

```bash
npx playwright install chromium   # une seule fois
npm run qa                        # cible http://localhost:4173/ par défaut
node scripts/qa.mjs https://pethuelelie-glitch.github.io/kanivo/   # cibler le site en ligne
```

La recette parcourt le site en desktop (1440×900), en mobile (390×844, tactile) et en `prefers-reduced-motion`. Elle vérifie la console, les requêtes en échec et le débordement horizontal, pilote le simulateur et enregistre les captures dans `livrable/captures/` et les résultats dans `livrable/tests/qa-results.json`. Le code de sortie est non nul en cas d'erreur.

Pour Lighthouse :

```bash
npx lighthouse http://localhost:4173/ --preset=desktop --view
npx lighthouse http://localhost:4173/ --view   # profil mobile
```

## 5. Régénérer le PowerPoint

```bash
npm run deck
```

Le script `deck/build-deck.cjs` écrit `livrable/Kanivo-Inondations-Abidjan.pptx`. Le module `deck/motion.cjs` y ajoute ensuite les transitions (Morph, avec repli Fondu) et les animations d'entrée de chaque slide. Pour voir le mouvement, lancez le diaporama dans PowerPoint 2019 ou 365 (Morph), ou dans LibreOffice Impress (Fondu). Il réutilise les captures de `livrable/captures/` : lancez `npm run qa` d'abord si vous voulez des captures à jour.

## 6. Déploiement

Chaque `git push` sur `main` déclenche `.github/workflows/deploy.yml`, qui installe, construit puis publie `dist/` sur GitHub Pages. Pour un nouveau dépôt, activez Pages avec la source « GitHub Actions » (*Settings → Pages*), ou en ligne de commande :

```bash
gh api -X POST repos/<compte>/<depot>/pages -f build_type=workflow
```

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Animations absentes | `prefers-reduced-motion` actif dans le système | Comportement voulu : le contenu reste entièrement lisible |
| Le port 5173 ou 4173 est occupé | Un autre serveur tourne | `npm run dev -- --port 5180` |
| `npm run qa` échoue avec `ECONNREFUSED` | `npm run preview` n'est pas lancé | Démarrez-le dans un autre terminal |
| Le deck ne trouve pas les captures | `livrable/captures/` absent | Lancez `npm run preview` puis `npm run qa` avant `npm run deck` |
