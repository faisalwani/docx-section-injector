import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This must match your repository name exactly
  base: '/docx-section-injector/', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});