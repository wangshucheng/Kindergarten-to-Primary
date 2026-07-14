import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageTransition } from './components/PageTransition';
import { FullScreenLoader } from './components/Spinner';
import { SkeletonGrid } from './components/Skeleton';

// —— 路由级代码分割：各页面按需加载，缩小首屏体积、加快首次渲染 ——
const HomePage = lazy(() => import('./pages/HomePage'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const GamePage = lazy(() => import('./pages/GamePage'));

/** 列表类页面的加载骨架（避免白屏与布局跳动） */
function ListFallback() {
  return (
    <div className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto animate-fadeIn">
      <SkeletonGrid count={6} />
    </div>
  );
}

/**
 * 路由表（HashRouter，避免 GitHub Pages 深链刷新 404）：
 *   /                -> 主页（四大模块入口）
 *   /:module         -> 模块页（该模块游戏列表）
 *   /:module/:gameId -> 游戏页（加载 GameShell）
 *
 * 每个页面独立懒加载 + Suspense 骨架回退，并统一包裹 PageTransition 实现顺滑切换。
 */
export function AppRoutes() {
  return (
    <PageTransition>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<ListFallback />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/:module"
          element={
            <Suspense fallback={<ListFallback />}>
              <ModulePage />
            </Suspense>
          }
        />
        <Route
          path="/:module/:gameId"
          element={
            <Suspense fallback={<FullScreenLoader label="正在加载游戏…" />}>
              <GamePage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  );
}
