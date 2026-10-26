import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages /WebFishing/).
  base: './',
  build: {
    chunkSizeWarningLimit: 1000, // three.js alone is ~600 kB
  },
});
