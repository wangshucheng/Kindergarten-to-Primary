/**
 * hanziGenerator 测试（node 环境）。
 * 验证按 level/mode 抽题、知识点编号、以及同种子可复现。
 */
import { describe, expect, it } from 'vitest';
import { genHanzi } from '../data/generators/hanziGenerator';
import type { GenOpts } from '../data/types';

describe('genHanzi', () => {
  it('默认 char-pinyin 模式返回 count 道题且字段完整', () => {
    const opts: GenOpts = { level: 1, count: 5, seed: 42 };
    const qs = genHanzi(opts);
    expect(qs.length).toBe(5);
    expect(qs.every((q) => q.kind === 'char-pinyin')).toBe(true);
    expect(qs.every((q) => typeof q.char === 'string' && typeof q.pinyin === 'string')).toBe(true);
    expect(qs.every((q) => q.knowledgePoint.startsWith('hanzi:'))).toBe(true);
  });

  it('同种子可复现', () => {
    const a = genHanzi({ level: 2, count: 8, seed: 7 });
    const b = genHanzi({ level: 2, count: 8, seed: 7 });
    expect(a.map((q) => q.char)).toEqual(b.map((q) => q.char));
  });

  it('antonym 模式只产出含反义的词', () => {
    const qs = genHanzi({ level: 1, count: 20, mode: 'antonym', seed: 3 });
    expect(qs.length).toBeGreaterThan(0); // 数据含足量反义词
    expect(qs.every((q) => q.kind === 'antonym' && typeof q.antonym === 'string' && q.antonym.length > 0)).toBe(true);
  });

  it('measure 模式只产出含量词的词', () => {
    const qs = genHanzi({ level: 1, count: 20, mode: 'measure', seed: 5 });
    expect(qs.length).toBeGreaterThan(0); // 数据含足量量词
    expect(qs.every((q) => q.kind === 'measure' && typeof q.measureWord === 'string' && q.measureWord.length > 0)).toBe(true);
  });
});
