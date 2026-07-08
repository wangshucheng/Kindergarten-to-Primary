import { describe, it, expect } from 'vitest';
import {
  MOTION_LABEL,
  makeThreeViewQuestion,
  makeMotionQuestion,
  makeLengthQuestion,
  type MotionKind,
} from '../games/geometry/geometryLogic';

/** 可复现随机数源（线性同余），用于单测 */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('makeThreeViewQuestion', () => {
  it('1000 次：列数 2~4、每列 1~4，kind 合法', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeThreeViewQuestion(seededRng(i + 1));
      expect(q.columns.length).toBeGreaterThanOrEqual(2);
      expect(q.columns.length).toBeLessThanOrEqual(4);
      for (const h of q.columns) {
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(4);
      }
      expect(['top', 'front']).toContain(q.kind);
    }
  });

  it('top 答案 = 列数；front 答案 = 最高层', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeThreeViewQuestion(seededRng(i + 3));
      if (q.kind === 'top') {
        expect(q.answer).toBe(q.columns.length);
        expect(q.prompt).toContain('上面');
      } else {
        expect(q.answer).toBe(Math.max(...q.columns));
        expect(q.prompt).toContain('正面');
      }
    }
  });

  it('选项 4 个，含答案且唯一', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeThreeViewQuestion(seededRng(i + 5));
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
    }
  });
});

describe('makeMotionQuestion', () => {
  const MOTIONS = ['平移', '旋转', '轴对称'];

  it('1000 次：答案属于三种运动之一，选项恰好 3 个且含答案', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeMotionQuestion(seededRng(i + 7));
      expect(MOTIONS).toContain(q.answer);
      expect(q.options).toHaveLength(3);
      expect(q.options).toContain(q.answer);
    }
  });

  it('选项为三种运动的全排列之一，且唯一', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeMotionQuestion(seededRng(i + 11));
      expect(new Set(q.options)).toEqual(new Set(MOTIONS));
      expect(new Set(q.options).size).toBe(3);
    }
  });

  it('kind 与 answer 通过 MOTION_LABEL 一致', () => {
    for (let i = 0; i < 300; i++) {
      const q = makeMotionQuestion(seededRng(i + 17));
      expect(q.answer).toBe(MOTION_LABEL[q.kind as MotionKind]);
    }
  });

  it('prompt 固定为「这是哪种运动？」', () => {
    for (let i = 0; i < 100; i++) {
      const q = makeMotionQuestion(seededRng(i + 19));
      expect(q.prompt).toBe('这是哪种运动？');
    }
  });
});

describe('makeLengthQuestion', () => {
  it('1000 次：kind 合法', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeLengthQuestion(seededRng(i + 23));
      expect(['choose', 'convert']).toContain(q.kind);
    }
  });

  it('choose：选项固定为「厘米/米」，答案为二者之一', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeLengthQuestion(seededRng(i + 29));
      if (q.kind === 'choose') {
        expect(new Set(q.options)).toEqual(new Set(['厘米', '米']));
        expect(['厘米', '米']).toContain(q.answer);
        expect(q.objectName).toBeTruthy();
        expect(q.prompt).toContain(q.objectName!);
      }
    }
  });

  it('convert：答案为 100，选项含 100 且恰好 3 个', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeLengthQuestion(seededRng(i + 31));
      if (q.kind === 'convert') {
        expect(q.answer).toBe('100');
        expect(q.options).toContain('100');
        expect(q.options).toHaveLength(3);
        expect(q.prompt).toContain('1 米');
      }
    }
  });

  it('选项唯一且含答案', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeLengthQuestion(seededRng(i + 37));
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options).toContain(q.answer);
    }
  });
});

describe('MOTION_LABEL 映射', () => {
  it('三种运动中文名正确', () => {
    expect(MOTION_LABEL.translation).toBe('平移');
    expect(MOTION_LABEL.rotation).toBe('旋转');
    expect(MOTION_LABEL.axisSymmetry).toBe('轴对称');
  });

  it('映射恰好覆盖三种运动', () => {
    expect(Object.keys(MOTION_LABEL)).toEqual(['translation', 'rotation', 'axisSymmetry']);
  });
});

describe('rng 可复现', () => {
  it('makeThreeViewQuestion：同种子生成同题', () => {
    const a = makeThreeViewQuestion(seededRng(99));
    const b = makeThreeViewQuestion(seededRng(99));
    expect(a).toEqual(b);
  });

  it('makeMotionQuestion：同种子生成同题', () => {
    const a = makeMotionQuestion(seededRng(123));
    const b = makeMotionQuestion(seededRng(123));
    expect(a).toEqual(b);
  });

  it('makeLengthQuestion：同种子生成同题', () => {
    const a = makeLengthQuestion(seededRng(456));
    const b = makeLengthQuestion(seededRng(456));
    expect(a).toEqual(b);
  });
});
