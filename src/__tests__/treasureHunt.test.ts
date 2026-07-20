import { describe, expect, it } from 'vitest';
import { generateTreasureRound } from '../games/english/TreasureHunt/treasureLogic';

describe('主题寻宝 - treasureLogic', () => {
  it('生成回合含 1 个正确目标与若干干扰项', () => {
    const r = generateTreasureRound(2024);
    expect(r.options.length).toBe(6);
    const targets = r.options.filter((o) => o.isTarget);
    expect(targets).toHaveLength(1);
    // 目标在选项内
    expect(r.options.some((o) => o.key === targets[0].key && o.word === targets[0].word)).toBe(true);
    // 干扰项互不相同且非目标
    const others = r.options.filter((o) => !o.isTarget);
    expect(new Set(others.map((o) => o.word)).size).toBe(others.length);
  });

  it('指令文本包含目标词', () => {
    const r = generateTreasureRound(7);
    expect(r.instruction.toLowerCase()).toContain(r.targetWord.toLowerCase());
  });

  it('颜色类与实物类都会出现', () => {
    const types = new Set<string>();
    for (let s = 0; s < 40; s++) types.add(generateTreasureRound(s).type);
    expect(types.has('color')).toBe(true);
    expect(types.has('object')).toBe(true);
  });

  it('同种子可复现', () => {
    expect(generateTreasureRound(555)).toEqual(generateTreasureRound(555));
  });

  it('目标词与选项词都是合法小写单词', () => {
    const r = generateTreasureRound(33);
    expect(r.targetWord).toMatch(/^[a-z]+$/);
    for (const o of r.options) expect(o.word).toMatch(/^[a-z]+$/);
  });
});
