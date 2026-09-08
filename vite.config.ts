import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Netlify and `npm run dev` serve from the root; the GitHub Pages workflow
  // sets BASE_PATH to /<repo>/ because Pages serves from a subdirectory.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
