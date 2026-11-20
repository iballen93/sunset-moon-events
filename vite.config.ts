import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the same build works in the Capacitor apps (served from the root)
  // and on GitHub Pages (served from /sunset-moon-events/).
  base: './',
});
