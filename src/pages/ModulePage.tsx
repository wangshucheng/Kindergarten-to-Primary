import { Link, useNavigate, useParams } from 'react-router-dom';
import configData from '../data/config.json';
import { moduleColors, palette } from '../theme/tokens';
import { useProgress } from '../state/ProgressStore';
import type { ModuleKey } from '../games/types';

interface ModuleEntry {
  key: string;
  title: string;
  icon: string;
  description?: string;
  games: { id: string; title: string; icon: string; priority: string }[];
}

const modules = (configData as { modules: ModuleEntry[] }).modules;

/**
 * ModulePage —— 模块页：列出该模块下的游戏卡片，点击进入游戏。
 */
export function ModulePage() {
  const { module } = useParams();
  const navigate = useNavigate();
  const { getRecord } = useProgress();

  const entry = modules.find((m) => m.key === module);
  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-ink text-lg">没有找到这个模块～</p>
        <button
          className="px-5 py-3 rounded-3xl bg-peach shadow-press font-bold text-ink"
          onClick={() => navigate('/')}
        >
          回到首页
        </button>
      </div>
    );
  }

  const colorKey = moduleColors[entry.key] ?? 'peach';
  const bg = palette[colorKey];

  return (
    <div className="min-h-screen px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="w-11 h-11 rounded-2xl bg-white shadow-press text-xl active:scale-95"
          style={{ touchAction: 'manipulation' }}
          aria-label="返回首页"
        >
          ←
        </button>
        <span className="text-4xl">{entry.icon}</span>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{entry.title}</h1>
          {entry.description && <p className="text-inkSoft text-sm">{entry.description}</p>}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {entry.games.map((g) => {
          const rec = getRecord(g.id);
          return (
            <Link
              key={g.id}
              to={`/${entry.key}/${g.id}`}
              className="flex items-center gap-3 rounded-4xl p-5 shadow-soft active:scale-95 transition-transform bg-white"
              style={{ touchAction: 'manipulation' }}
            >
              <span
                className="w-14 h-14 rounded-3xl flex items-center justify-center text-3xl shadow-inner"
                style={{ background: bg }}
              >
                {g.icon}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-ink">{g.title}</h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold text-ink"
                    style={{ background: g.priority === 'P0' ? '#FFE066' : '#E7DDD0' }}
                  >
                    {g.priority}
                  </span>
                </div>
                {rec && (
                  <p className="text-inkSoft text-xs mt-0.5">
                    最高分 {rec.bestScore} · {'★'.repeat(rec.stars)}
                    {'☆'.repeat(3 - rec.stars)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

export default ModulePage;
