import { describe, it, expect } from 'vitest';
import { buildLetterRound, getLetters } from '../games/english/LetterCase/letterLogic';

const letters = getLetters();

describe('LetterCase 字母大小写逻辑', () => {
  it('getLetters 返回非空字母对（大小写对应）', () => {
    expect(letters.length).toBeGreaterThan(0);
    for (const l of letters) {
      expect(l.upper).not.toBe(l.lower);
      expect(l.upper.toLowerCase()).toBe(l.lower);
    }
  });

  it('buildLetterRound：两列数量等于 count', () => {
    const r = buildLetterRound(6, 123);
    expect(r.upper.length).toBe(6);
    expect(r.lower.length).toBe(6);
  });

  it('buildLetterRound：按 id 配对的大小写互为同一字母', () => {
    const r = buildLetterRound(8, 456);
    const valid = new Set(letters.map((l) => l.upper + '|' + l.lower));
    for (let id = 0; id < r.upper.length; id++) {
      const u = r.upper.find((x) => x.id === id)!;
      const lo = r.lower.find((x) => x.id === id)!;
      expect(u).toBeDefined();
      expect(lo).toBeDefined();
      expect(valid.has(u.char + '|' + lo.char)).toBe(true);
      expect(u.char.toLowerCase()).toBe(lo.char);
    }
  });

  it('buildLetterRound：大小写两列均来自所选字母集合', () => {
    const r = buildLetterRound(5, 789);
    const valid = new Set(letters.map((l) => l.upper + l.lower));
    for (let id = 0; id < r.upper.length; id++) {
      const u = r.upper.find((x) => x.id === id)!.char;
      const lo = r.lower.find((x) => x.id === id)!.char;
      expect(valid.has(u + lo)).toBe(true);
    }
  });

  it('buildLetterRound：同种子可复现', () => {
    const a = buildLetterRound(5, 321);
    const b = buildLetterRound(5, 321);
    expect(a).toEqual(b);
  });

  it('buildLetterRound：不同种子顺序不同（洗牌生效）', () => {
    const a = buildLetterRound(6, 11);
    const b = buildLetterRound(6, 22);
    expect(a.upper.map((x) => x.char)).not.toEqual(b.upper.map((x) => x.char));
  });
});
