import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相对 base，部署到 GitHub Pages 子路径也不会 404
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 代码分割：将大型依赖独立打包
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'state-vendor': ['zustand'],
        },
      },
    },
    // 构建产物大小警告阈值
    chunkSizeWarningLimit: 500,
    // 目标浏览器优化
    target: 'es2020',
  },
  // 开发服务器优化
  server: {
    open: false,
    hmr: true,
  },
});
