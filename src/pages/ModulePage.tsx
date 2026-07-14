import { Link, useNavigate, useParams } from 'react-router-dom';
import { getModules, getModuleGames, toGameEntry, getGame } from '../games/registry';
import { moduleGradient } from '../theme/tokens';
import { useProgress } from '../state/ProgressStore';
import type { ModuleKey } from '../games/types';
import type { PreloadableGame } from '../games/lazyGame';
import { Reveal } from '../components/Reveal';
import { Button } from '../components/Button';

/** 悬停/按下游戏卡片时预取其代码 chunk，进入游戏页几乎无等待 */
function preloadGame(id: string): void {
  const comp = getGame(id)?.component as PreloadableGame | undefined;
  comp?.preload?.().catch(() => {
    /* 预取失败可忽略，进入页面时会正常懒加载 */
  });
}

/**
 * ModulePage —— 模块页：列出该模块下的游戏卡片，点击进入游戏。
 * 高级化：玻璃返回头 + 渐变图标章 + 进度可视化 + 错峰入场。
 */
export function ModulePage() {
  const { module } = useParams();
  const navigate = useNavigate();
  const { getRecord } = useProgress();

  const entry = getModules().find((m) => m.key === module);
  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-6xl animate-floaty">🧭</div>
        <p className="text-ink text-lg font-bold">没有找到这个模块～</p>
        <Button variant="peach" size="lg" onClick={() => navigate('/')}>
          回到首页
        </Button>
      </div>
    );
  }

  const bg = moduleGradient(entry.key);
  const games = getModuleGames(entry.key as ModuleKey).map(toGameEntry);

  return (
    <div className="min-h-screen px-5 pt-7 pb-12 max-w-3xl mx-auto">
      <Reveal as="section" anim="fadeIn" className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate('/')}
          className="shrink-0 w-11 h-11 rounded-2xl glass shadow-sm text-xl grid place-items-center transition-transform duration-200 ease-spring active:scale-90 hover:shadow-soft"
          style={{ touchAction: 'manipulation' }}
          aria-label="返回首页"
        >
          <span className="-mt-0.5">←</span>
        </button>
        <span
          className="w-14 h-14 rounded-3xl grid place-items-center text-3xl shadow-soft shadow-insetTop"
          style={{ background: bg }}
        >
          {entry.icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink tracking-tightish">{entry.title}</h1>
          {entry.description && (
            <p className="text-inkSoft text-sm line-clamp-1">{entry.description}</p>
          )}
        </div>
      </Reveal>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map((g, i) => {
          const rec = getRecord(g.id);
          return (
            <Reveal key={g.id} anim="fadeInUp" index={i} step={45}>
              <Link
                to={`/${entry.key}/${g.id}`}
                onMouseEnter={() => preloadGame(g.id)}
                onPointerDown={() => preloadGame(g.id)}
                className="group flex items-center gap-3.5 rounded-4xl p-4 shadow-soft glass-strong transition-[transform,box-shadow] duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift active:scale-[0.98]"
                style={{ touchAction: 'manipulation' }}
              >
                <span
                  className="w-14 h-14 rounded-3xl grid place-items-center text-3xl shadow-insetTop shrink-0 transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-6"
                  style={{ background: bg }}
                >
                  {g.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-ink truncate tracking-tightish">
                      {g.title}
                    </h3>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold text-ink shrink-0"
                      style={{ background: g.priority === 'P0' ? '#FFE066' : '#EDE4D8' }}
                    >
                      {g.priority}
                    </span>
                  </div>
                  {rec ? (
                    <p className="text-inkSoft text-xs mt-1 flex items-center gap-1.5">
                      <span>最高分 {rec.bestScore}</span>
                      <span className="text-lemon">
                        {'★'.repeat(rec.stars)}
                        <span className="text-hairlineStrong">{'★'.repeat(3 - rec.stars)}</span>
                      </span>
                    </p>
                  ) : (
                    <p className="text-inkSoft/60 text-xs mt-1">未挑战 · 点击开始</p>
                  )}
                </div>
                <span className="text-inkSoft/40 text-lg shrink-0 transition-transform duration-300 ease-spring group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Reveal>
          );
        })}
      </section>
    </div>
  );
}

export default ModulePage;
