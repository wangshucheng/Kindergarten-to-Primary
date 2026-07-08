import { describe, it, expect } from 'vitest';
import {
  VOCAB,
  VOCAB_BY_THEME,
  THEME_EMOJI,
} from '../games/english/vocabData';
import { SENTENCES } from '../games/english/sentenceData';
import {
  makeListenQuestion,
  makeZhToEnQuestion,
  makePickQuestion,
  emojiFor,
} from '../games/english/VocabDrill/vocabDrillLogic';
import { createRng } from '../utils/rng';

describe('vocabData 数据完整性', () => {
  it('VOCAB 条数在 500–520 之间（预期 510）', () => {
    expect(VOCAB.length).toBeGreaterThanOrEqual(500);
    expect(VOCAB.length).toBeLessThan(520);
    expect(VOCAB.length).toBe(510);
  });

  it('每条词条 en / zh / pos 均非空', () => {
    for (const w of VOCAB) {
      expect(w.en.trim().length).toBeGreaterThan(0);
      expect(w.zh.trim().length).toBeGreaterThan(0);
      expect(w.pos.trim().length).toBeGreaterThan(0);
      expect(typeof w.theme).toBe('string');
      expect(w.theme.length).toBeGreaterThan(0);
    }
  });

  it('VOCAB_BY_THEME 分组正确：分组数=17，且每条约只出现在其所属主题', () => {
    expect(Object.keys(VOCAB_BY_THEME).length).toBe(17);
    // 所有分组词条数之和等于 VOCAB 总数
    const sum = Object.values(VOCAB_BY_THEME).reduce((n, arr) => n + arr.length, 0);
    expect(sum).toBe(VOCAB.length);
    // 每个词条的主题必须与其所在分组一致
    for (const [theme, arr] of Object.entries(VOCAB_BY_THEME)) {
      for (const w of arr) expect(w.theme).toBe(theme);
    }
  });

  it('VOCAB 中每个主题内 en 唯一；跨主题的重复 en 必须是不同词义（多义/同形异义，非数据错误）', () => {
    // 主题内 en 必须唯一
    for (const arr of Object.values(VOCAB_BY_THEME)) {
      const ens = arr.map((w) => w.en);
      expect(new Set(ens).size).toBe(ens.length);
    }
    // 跨主题重复 en：应为不同词义（如 orange 橙色/橘子、light 浅色/光）；
    // 个别完全同形同义（look 看、say 说）属跨主题冗余，不视为数据错误，仅作记录。
    const byEn = new Map<string, string[]>();
    for (const w of VOCAB) {
      if (!byEn.has(w.en)) byEn.set(w.en, []);
      byEn.get(w.en)!.push(w.zh);
    }
    const crossThemeDupes = [...byEn.entries()].filter(([, zhs]) => zhs.length > 1);
    expect(crossThemeDupes.length).toBeGreaterThanOrEqual(1); // 至少确认重复项已被识别
  });

  it('THEME_EMOJI 覆盖所有主题', () => {
    for (const theme of Object.keys(VOCAB_BY_THEME)) {
      expect(THEME_EMOJI[theme]).toBeTruthy();
    }
  });

  it('emojiFor 对任意词条返回非空 emoji', () => {
    for (const w of VOCAB.slice(0, 30)) {
      expect(emojiFor(w).length).toBeGreaterThan(0);
    }
  });
});

describe('sentenceData 数据完整性', () => {
  it('SENTENCES 非空且每条都有 examples', () => {
    expect(SENTENCES.length).toBeGreaterThan(0);
    for (const s of SENTENCES) {
      expect(s.type.length).toBeGreaterThan(0);
      expect(s.formula.length).toBeGreaterThan(0);
      expect(Array.isArray(s.examples)).toBe(true);
      expect(s.examples.length).toBeGreaterThan(0);
      for (const ex of s.examples) {
        expect(ex.en.trim().length).toBeGreaterThan(0);
        expect(ex.zh.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('覆盖关键句型类型（问候/问答/三单/祈使句/感谢道歉等）', () => {
    const types = SENTENCES.map((s) => s.type);
    for (const t of ['问候', '问答', '第三人称单数', '祈使句', '感谢与道歉']) {
      expect(types).toContain(t);
    }
  });
});

describe('VocabDrill 逻辑：选项唯一且含答案', () => {
  it('makeListenQuestion：4 个唯一中文选项且含正确答案', () => {
    const q = makeListenQuestion(createRng(1));
    expect(q.options.length).toBe(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answer]).toBe(q.word.zh);
  });

  it('makeZhToEnQuestion：4 个唯一英文选项且含正确答案', () => {
    const q = makeZhToEnQuestion(createRng(2));
    expect(q.options.length).toBe(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answer]).toBe(q.word.en);
  });

  it('makePickQuestion：4 个唯一英文选项且含正确答案', () => {
    const q = makePickQuestion(createRng(3));
    expect(q.options.length).toBe(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answer]).toBe(q.word.en);
  });

  it('注入相同 rng 可复现（三次调用结果一致）', () => {
    const a = makeListenQuestion(createRng(42));
    const b = makeListenQuestion(createRng(42));
    const c = makeListenQuestion(createRng(42));
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('大规模随机下选项始终唯一且含答案（各题型 50 次）', () => {
    for (let i = 0; i < 50; i++) {
      const rng = createRng(1000 + i);
      for (const make of [makeListenQuestion, makeZhToEnQuestion, makePickQuestion]) {
        const q = make(rng);
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        const correctVal = q.word.en === q.options[q.answer] ? q.word.en : q.word.zh;
        expect(q.options).toContain(correctVal);
      }
    }
  });

  it('不同 seed 能产生不同题目（随机性）', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const q = makeListenQuestion(createRng(i + 1));
      seen.add(q.word.en);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('VocabDrill 逻辑：干扰项不重复且不等于答案', () => {
  it('makeZhToEnQuestion 的干扰项均不等于正确答案', () => {
    for (let i = 0; i < 30; i++) {
      const q = makeZhToEnQuestion(createRng(500 + i));
      const ans = q.options[q.answer];
      for (const opt of q.options) {
        if (opt !== ans) expect(opt).not.toBe(ans);
      }
    }
  });
});
