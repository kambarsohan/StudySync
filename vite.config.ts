import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000, strictPort: true },
  preview: { host: '0.0.0.0', port: 3000, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
          if (id.includes('/@supabase/')) return 'supabase-vendor'
          if (id.includes('/@tanstack/')) return 'query-vendor'
          if (id.includes('/date-fns')) return 'datetime-vendor'
          if (id.includes('/lucide-react/')) return 'icons-vendor'
          if (id.includes('/react-hook-form/') || id.includes('/zod/')) return 'forms-vendor'
          return undefined
        },
      },
    },
  },
})
