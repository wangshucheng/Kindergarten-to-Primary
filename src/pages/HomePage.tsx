import { Link } from 'react-router-dom';
import configData from '../data/config.json';
import { moduleColors, palette } from '../theme/tokens';
import { useProgress } from '../state/ProgressStore';
import { getGame } from '../games/registry';
import type { ModuleMeta } from '../games/types';
import { StarRating } from '../components/StarRating';

interface ModuleEntry {
  key: string;
  title: string;
  icon: string;
  description?: string;
  games: { id: string; title: string; icon: string; priority: string }[];
}

const modules = (configData as { modules: ModuleEntry[] }).modules;
const moduleMeta: ModuleMeta[] = modules.map((m) => ({
  key: m.key as ModuleMeta['key'],
  title: m.title,
  icon: m.icon,
  description: m.description,
}));

/**
 * HomePage —— 首页：四大模块入口 + 星星总数 + 最近游玩。
 */
export function HomePage() {
  const { totalStars, recent } = useProgress();

  const recentTitles = recent
    .map((id) => getGame(id)?.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 4);

  return (
    <div className="min-h-screen px-4 pt-8 pb-10">
      <header className="text-center mb-8">
        <div className="text-6xl mb-2 animate-floaty">🎈</div>
        <h1 className="text-3xl font-extrabold text-ink">幼升小游戏合集</h1>
        <p className="text-inkSoft mt-1">和爸爸妈妈一起快乐学习吧！</p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lemon/70 text-ink font-bold">
          ⭐ 我的星星：{totalStars}
        </div>
      </header>

      {recentTitles.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-ink mb-2">🕒 最近游玩</h2>
          <div className="flex flex-wrap gap-2">
            {recentTitles.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="px-3 py-1.5 rounded-full bg-white shadow-soft text-ink text-sm font-bold"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((m) => {
          const colorKey = moduleColors[m.key] ?? 'peach';
          const bg = palette[colorKey];
          return (
            <Link
              key={m.key}
              to={`/${m.key}`}
              className="block rounded-4xl p-5 shadow-soft active:scale-95 transition-transform"
              style={{ background: bg, touchAction: 'manipulation' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-5xl">{m.icon}</span>
                <div>
                  <h3 className="text-2xl font-extrabold text-ink">{m.title}</h3>
                  {m.description && (
                    <p className="text-ink/80 text-sm mt-0.5">{m.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {m.games.slice(0, 3).map((g) => (
                  <span
                    key={g.id}
                    className="px-2.5 py-1 rounded-full bg-white/70 text-ink text-xs font-bold"
                  >
                    {g.icon} {g.title}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-10 text-center text-inkSoft text-xs">
        <StarRating value={Math.min(3, Math.floor(totalStars / 10))} />
        <p className="mt-1">加油，你越来越棒啦！</p>
      </footer>
    </div>
  );
}

export default HomePage;
