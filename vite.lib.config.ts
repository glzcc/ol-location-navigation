import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), react()],
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OlLocationNavigation',
      formats: ['es', 'cjs'],
      fileName: format =>
        format === 'es' ? 'ol-location-navigation.js' : 'ol-location-navigation.cjs'
    },
    rollupOptions: {
      external: id =>
        id === 'ol' ||
        id.startsWith('ol/') ||
        id === 'vue' ||
        id === 'react' ||
        id === 'react-dom' ||
        id === 'react/jsx-runtime',
      output: {
        globals: {
          ol: 'ol',
          vue: 'Vue',
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJsxRuntime'
        },
        assetFileNames: assetInfo =>
          assetInfo.name?.endsWith('.css') ? 'ol-location-navigation.css' : '[name][extname]'
      }
    }
  }
});
