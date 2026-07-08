import { useCallback, useState } from 'react';
import type { GameProps } from '../types';
import { useTTS } from '../../sound/useTTS';
import { Button } from '../../components/Button';
import { poems } from './poems';

/**
 * PoetryGame —— 必背古诗文「背诵展示卡」。
 *
 * 单游戏 + 内部翻页：整本诗集共用一张卡片，逐首浏览；
 * 支持隐藏正文自测背诵、TTS 整首/逐句朗读（跟随 HUD 中/粤/英偏好）。
 * 纯辅助背诵，不调用 onComplete，用户通过 HUD 返回按钮退出。
 */
export function PoetryGame({ config, tts: ttsManager }: GameProps) {
  const tts = useTTS(ttsManager);
  const [index, setIndex] = useState(0);
  const [hideBody, setHideBody] = useState(false);

  const total = poems.length;
  const poem = poems[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const speakWhole = useCallback(() => {
    const body = poem.lines.map((l) => l.text).join('');
    tts.speakZh(`${poem.title}。${poem.author}。${body}`);
  }, [poem, tts]);

  const toggleHide = useCallback(() => {
    setHideBody((h) => !h);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      {/* 顶部：进度 + 标题 + 作者朝代 */}
      <header className="text-center">
        <p className="text-inkSoft text-sm font-bold">
          第 {index + 1} / {total} 首
        </p>
        <h1 className="text-ink text-4xl font-extrabold">{poem.title}</h1>
        <p className="text-inkSoft text-base font-bold">
          {poem.dynasty}·{poem.author}
        </p>
        {poem.themes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {poem.themes.map((theme) => (
              <span
                key={theme}
                className="bg-mint/20 text-ink rounded-full px-3 py-1 text-xs font-bold"
              >
                #{theme}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* 正文卡片 */}
      <section className="bg-cream rounded-3xl p-6 shadow-soft">
        {hideBody ? (
          <p className="text-inkSoft py-10 text-center text-2xl font-bold">
            🤫 盖住啦，试着背一背
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {poem.lines.map((line, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-inkSoft text-sm">{line.pinyin}</p>
                  <p className="text-ink text-2xl font-bold">{line.text}</p>
                </div>
                <Button
                  variant="mint"
                  size="sm"
                  onClick={() => tts.speakZh(line.text)}
                  aria-label={`朗读：${line.text}`}
                >
                  🔊
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 儿童释义 */}
      {!hideBody && (
        <section className="bg-white/60 rounded-2xl p-5">
          <h2 className="text-ink mb-1 text-lg font-bold">💡 儿童释义</h2>
          <p className="text-ink text-base leading-relaxed">{poem.explanation}</p>
        </section>
      )}

      {/* 控制条 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="ghost" size="md" onClick={goPrev}>
          ⬅️ 上一首
        </Button>
        <Button variant="mint" size="md" onClick={speakWhole}>
          🔊 朗读整首
        </Button>
        <Button variant="ghost" size="md" onClick={goNext}>
          ➡️ 下一首
        </Button>
        <Button variant="lemon" size="md" onClick={toggleHide}>
          {hideBody ? '👀 显示正文' : '🙈 隐藏正文'}
        </Button>
      </div>
    </div>
  );
}
