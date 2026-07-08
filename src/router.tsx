import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ModulePage from './pages/ModulePage';
import GamePage from './pages/GamePage';

/**
 * 路由表（HashRouter，避免 GitHub Pages 深链刷新 404）：
 *   /                -> 主页（四大模块入口）
 *   /:module         -> 模块页（该模块游戏列表）
 *   /:module/:gameId -> 游戏页（加载 GameShell）
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:module" element={<ModulePage />} />
      <Route path="/:module/:gameId" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

