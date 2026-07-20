import { describe, expect, it } from 'vitest';
import { buildFlashRound, getPhonics, LETTERS, PHONICS } from '../games/english/LetterFlash/letterFlashLogic';

describe('字母音闪电卡 - letterFlashLogic', () => {
  it('每个字母都有拼读提示', () => {
    expect(LETTERS.length).toBe(26);
    for (const L of LETTERS) {
      const info = getPhonics(L);
      expect(info).toBeDefined();
      expect(info?.example).toMatch(/^[a-z-]+$/);
      expect(info?.emoji.length).toBeGreaterThan(0);
      expect(info?.tip.length).toBeGreaterThan(0);
    }
  });

  it('getPhonics 大小写不敏感', () => {
    expect(getPhonics('a')).toBe(PHONICS['A']);
    expect(getPhonics('Z')).toBe(PHONICS['Z']);
  });

  it('buildFlashRound 默认生成互不重复的卡', () => {
    const cards = buildFlashRound(10, 12345);
    expect(cards).toHaveLength(10);
    const letters = new Set(cards.map((c) => c.letter));
    expect(letters.size).toBe(10);
  });

  it('同种子可复现', () => {
    const a = buildFlashRound(8, 999);
    const b = buildFlashRound(8, 999);
    expect(a).toEqual(b);
  });

  it('数量不超过字母总数', () => {
    const cards = buildFlashRound(999, 1);
    expect(cards).toHaveLength(26);
  });
});
