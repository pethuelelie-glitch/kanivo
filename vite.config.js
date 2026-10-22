import { defineConfig } from 'vite'

// base relative : le même build fonctionne en local et sur GitHub Pages (/kanivo/).
// Note : un preload des polices a été testé ; il dégradait le FCP mobile (4G simulée), il est donc écarté.
export default defineConfig({
  base: './',
  build: { target: 'es2020', cssMinify: true },
})
