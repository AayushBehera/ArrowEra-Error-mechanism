import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves this repository from a project subpath.
// Local development and non-GitHub deployments continue to use the root path.
const base =
  process.env.GITHUB_ACTIONS === 'true'
    ? '/ArrowEra-Error-mechanism/'
    : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
