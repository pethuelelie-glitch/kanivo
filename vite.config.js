import { defineConfig } from 'vite'

// base relative : le même build fonctionne en local et sur GitHub Pages (/kanivo/).
export default defineConfig({
  base: './',
  build: { target: 'es2020', cssMinify: true },
})
