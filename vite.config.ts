import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/ol-location-navigation/' : '/',
  plugins: [vue(), react()],
  server: {
    port: 41733,
    strictPort: true
  },
  build: {
    outDir: 'dist-demo'
  }
});
