import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const hotFile = path.resolve('public/hot')

function laravelHotFile() {
  return {
    name: 'laravel-hot-file',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        fs.mkdirSync(path.dirname(hotFile), { recursive: true })
        fs.writeFileSync(hotFile, 'http://localhost:5173')
      })
      const cleanup = () => fs.rmSync(hotFile, { force: true })
      process.once('exit', cleanup)
      process.once('SIGINT', () => { cleanup(); process.exit() })
      process.once('SIGTERM', () => { cleanup(); process.exit() })
    },
  }
}

export default defineConfig({
  plugins: [react(), laravelHotFile()],
  publicDir: false,
  server: { host: '127.0.0.1', port: 5173, strictPort: true, cors: true },
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: 'manifest.json',
    rollupOptions: { input: 'src/main.jsx' },
  },
})
