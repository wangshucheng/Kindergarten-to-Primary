import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相对 base，部署到 GitHub Pages 子路径也不会 404
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
