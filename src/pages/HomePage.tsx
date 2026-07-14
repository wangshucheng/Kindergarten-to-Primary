import { Link } from 'react-router-dom';
import { getModules, getModuleGames, toGameEntry } from '../games/registry';
import { moduleGradient } from '../theme/tokens';
import { useProgress } from '../state/ProgressStore';
import { getGame } from '../games/registry';
import { StarRating } from '../components/StarRating';
import { Reveal } from '../components/Reveal';

/**
 * HomePage —— 首页：四大模块入口 + 星星总数 + 最近游玩。
 * 高级化：更克制的留白与层级、玻璃质感星章、模块渐变大卡片、错峰入场动画。
 */
export function HomePage() {
  const { totalStars, recent } = useProgress();
  const modules = getModules();

  const recentTitles = recent
    .map((id) => getGame(id)?.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 4);

  return (
    <div className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto">
      <Reveal as="section" anim="fadeIn" className="text-center mb-9">
        <div className="text-6xl mb-3 inline-block animate-floaty">🎈</div>
        <h1 className="text-4xl font-extrabold text-ink tracking-tightish">幼升小游戏合集</h1>
        <p className="text-inkSoft mt-2">和爸爸妈妈一起，快乐学习每一天</p>
        <div className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-full glass text-ink font-bold shadow-soft">
          <span className="animate-breathe">⭐</span>
          <span className="tabular-nums">我的星星 {totalStars}</span>
        </div>
      </Reveal>

      {recentTitles.length > 0 && (
        <Reveal as="section" anim="fadeInUp" delay={80} className="mb-8">
          <h2 className="text-sm font-bold text-inkSoft mb-3 tracking-wide uppercase">最近游玩</h2>
          <div className="flex flex-wrap gap-2">
            {recentTitles.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="px-3.5 py-1.5 rounded-full glass text-ink text-sm font-bold shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((m, i) => {
          const bg = moduleGradient(m.key);
          const games = getModuleGames(m.key).slice(0, 3).map(toGameEntry);
          return (
            <Reveal key={m.key} anim="riseIn" index={i} step={70} delay={140}>
              <Link
                to={`/${m.key}`}
                className="sheen-hover group block rounded-4xl p-5 shadow-soft transition-[transform,box-shadow] duration-300 ease-spring hover:-translate-y-1.5 hover:shadow-float active:scale-[0.98]"
                style={{ background: bg, touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-5xl drop-shadow-sm transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-6">
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-extrabold text-ink tracking-tightish">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-ink/70 text-sm mt-0.5 line-clamp-1">{m.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {games.map((g) => (
                    <span
                      key={g.id}
                      className="px-2.5 py-1 rounded-full bg-white/55 text-ink text-xs font-bold backdrop-blur-sm"
                    >
                      {g.icon} {g.title}
                    </span>
                  ))}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </section>

      <footer className="mt-12 text-center text-inkSoft text-xs">
        <StarRating value={Math.min(3, Math.floor(totalStars / 10))} animated={false} />
        <p className="mt-2">加油，你越来越棒啦！</p>
      </footer>
    </div>
  );
}

export default HomePage;
