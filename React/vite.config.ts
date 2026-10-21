import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The PDF Viewer with all its modules is a large single bundle; this is expected.
    chunkSizeWarningLimit: 12000,
  },
});
