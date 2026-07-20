import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { generateTreasureRound, type TreasureOption, type TreasureRound } from './treasureLogic';
import { SpeechManager } from '../../../sound/SpeechManager';

const ROUNDS = 8;

type Phase = 'listen' | 'choose' | 'read' | 'result';

export function TreasureHuntGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, collectKnowledge, unlockMedal, combo, mistakesRef, scoreRef } =
    useScore();
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<TreasureRound>(() => generateTreasureRound(Date.now() & 0xffffffff));
  const [phase, setPhase] = useState<Phase>('listen');
  const [picked, setPicked] = useState<string | null>(null);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [readOk, setReadOk] = useState<boolean | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ended, setEnded] = useState(false);

  const startRef = useRef(Date.now());
  const endedRef = useRef(false);
  const speechRef = useRef<SpeechManager | null>(null);
  if (!speechRef.current) speechRef.current = new SpeechManager();
  const speechSupported = speechRef.current.isSupported();
  const goodReadsRef = useRef(0);

  useEffect(() => () => speechRef.current?.dispose(), []);

  // 新回合：播放语音指令 → 进入选择
  useEffect(() => {
    if (ended) return;
    speechRef.current?.stop();
    setPhase('listen');
    setPicked(null);
    setWrongKey(null);
    setReadOk(null);
    tts.speak(round.instruction, { lang: 'en-US', rate: 0.85 });
    const t = window.setTimeout(() => setPhase('choose'), 1200);
    return () => window.clearTimeout(t);
  }, [round, ended, tts]);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    onComplete({
      score: scoreRef.current,
      passed: true,
      stars: computeStars({ passed: true, mistakes: mistakesRef.current, durationMs }),
      durationMs,
      knowledgePoints: ['treasure-hunt'],
      medals: goodReadsRef.current >= Math.ceil(ROUNDS / 2) ? ['pronunciation-star'] : undefined,
    });
  }, [onComplete, scoreRef, mistakesRef]);

  const next = useCallback(() => {
    if (index + 1 >= ROUNDS) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setRound(generateTreasureRound((Date.now() + index * 7919) & 0xffffffff));
  }, [index, finish]);

  const choose = useCallback(
    (opt: TreasureOption) => {
      if (phase !== 'choose' || ended) return;
      sound.play('click');
      if (opt.isTarget) {
        setPicked(opt.word);
        addScore(10);
        bumpCombo();
        sound.play('correct');
        collectKnowledge(`treasure:${round.targetWord}`);
        tts.speak(round.targetWord, { lang: 'en-US', rate: 0.8 });
        setPhase('read');
      } else {
        addMistake();
        resetCombo();
        sound.play('wrong');
        setWrongKey(opt.word);
        window.setTimeout(() => setWrongKey(null), 450);
      }
    },
    [phase, ended, addScore, bumpCombo, addMistake, resetCombo, sound, tts, round, collectKnowledge],
  );

  const startRead = useCallback(() => {
    if (ended) return;
    // 降级：不支持语音识别时，给参与分并直接过关
    if (!speechSupported) {
      setReadOk(true);
      addScore(5);
      setPhase('result');
      window.setTimeout(next, 1200);
      return;
    }
    setSpeaking(true);
    speechRef.current?.listen({
      lang: 'en-US',
      interimResults: true,
      timeoutMs: 4500,
      onResult: (r) => {
        const text = r.transcript.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        if (text.includes(round.targetWord.toLowerCase())) {
          setReadOk(true);
          goodReadsRef.current += 1;
          addScore(15);
          unlockMedal('pronunciation-star');
          sound.play('win');
          setSpeaking(false);
          speechRef.current?.stop();
          setPhase('result');
          window.setTimeout(next, 1400);
        } else if (r.isFinal && text.length > 0) {
          setReadOk(false);
        }
      },
      onError: () => {
        setSpeaking(false);
        setReadOk(false);
      },
      onEnd: () => setSpeaking(false),
    });
  }, [ended, speechSupported, addScore, unlockMedal, sound, next, round]);

  const skipRead = useCallback(() => {
    speechRef.current?.stop();
    setSpeaking(false);
    setPhase('result');
    window.setTimeout(next, 1100);
  }, [next]);

  const comboBadge = combo > 1 ? `🔥 连击 x${combo}` : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between px-2 text-base font-bold text-ink/70">
        <span>
          第 {index + 1} / {ROUNDS} 关
        </span>
        {comboBadge && <span className="rounded-full bg-mint/30 px-3 py-1 text-mint">{comboBadge}</span>}
      </div>

      {/* 指令条 */}
      <div className="flex items-center gap-3 rounded-2xl bg-sky/20 px-5 py-3">
        <button
          type="button"
          onClick={() => tts.speak(round.instruction, { lang: 'en-US', rate: 0.85 })}
          className="text-3xl active:scale-90"
          aria-label="再听一次"
        >
          🔊
        </button>
        <span className="text-xl font-extrabold text-ink">{round.instruction}</span>
      </div>

      {/* 选择网格 */}
      {phase === 'choose' || phase === 'listen' ? (
        <div className="grid grid-cols-3 gap-3">
          {round.options.map((opt) => {
            const isWrong = wrongKey === opt.word;
            const isPicked = picked === opt.word;
            return (
              <button
                key={opt.word}
                type="button"
                disabled={phase !== 'choose'}
                onClick={() => choose(opt)}
                className={[
                  'flex h-28 w-28 items-center justify-center rounded-2xl border-4 text-5xl shadow-md transition active:scale-95',
                  isWrong
                    ? 'animate-shake border-red-400 bg-red-100'
                    : isPicked
                      ? 'border-mint bg-mint/30'
                      : 'border-cream bg-white hover:border-sky',
                  phase !== 'choose' ? 'opacity-70' : '',
                ].join(' ')}
              >
                {opt.key}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 跟读 / 结果 */}
      {phase === 'read' && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-4 border-mint/50 bg-mint/20 px-8 py-6 text-center">
          <span className="text-3xl">🎉 你找到了 {round.targetWord}！</span>
          <span className="text-7xl">{round.options.find((o) => o.isTarget)?.key}</span>
          <span className="text-xl font-extrabold text-ink">大声跟我读：{round.targetWord} 🎤</span>
          {speechSupported ? (
            <button
              type="button"
              onClick={startRead}
              disabled={speaking}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-lemon text-4xl shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {speaking ? '🎙️' : '🎤'}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRead}
              className="h-14 rounded-full bg-lemon px-6 text-xl font-extrabold text-ink shadow-lg active:scale-95"
            >
              读完啦（点这里计分）
            </button>
          )}
          <button type="button" onClick={skipRead} className="text-base font-bold text-ink/50 underline">
            跳过跟读
          </button>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-ink/70 px-10 py-6 text-center text-white">
          <span className="text-5xl">🎉</span>
          <span className="text-2xl font-extrabold">找到啦！</span>
          <span className="text-lg">
            {readOk === true
              ? '🗣️ 发音真棒！ +15'
              : readOk === false
                ? '🗣️ 跟读完成，再接再厉！'
                : '➡️ 继续下一关'}
          </span>
        </div>
      )}
    </div>
  );
}
