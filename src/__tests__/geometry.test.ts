import { describe, it, expect } from 'vitest';
import {
  ALL_SHAPES,
  FLAT_SHAPES,
  SOLID_SHAPES,
  makeAngleQuestion,
  makeCountCubesQuestion,
  makeRecognizeQuestion,
  makeSymmetryQuestion,
  type ShapeId,
} from '../games/geometry/geometryLogic';

/** 可复现随机数源（线性同余），用于单测 */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('形状数据完整性', () => {
  it('平面图形 5 种、立体图形 4 种，合计 9 种', () => {
    expect(FLAT_SHAPES).toHaveLength(5);
    expect(SOLID_SHAPES).toHaveLength(4);
    expect(ALL_SHAPES).toHaveLength(9);
  });

  it('每个图形有合法名称且 id 唯一', () => {
    const ids = ALL_SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ALL_SHAPES) expect(s.name.length).toBeGreaterThan(0);
  });

  it('平面图形边数在 {0,3,4}，立体图形面/棱/顶点非负', () => {
    for (const s of FLAT_SHAPES) {
      expect([0, 3, 4]).toContain(s.sides);
    }
    for (const s of SOLID_SHAPES) {
      expect(s.faces).toBeGreaterThanOrEqual(1);
      expect(s.edges).toBeGreaterThanOrEqual(0);
      expect(s.vertices).toBeGreaterThanOrEqual(0);
    }
  });

  it('能滚动的只有圆柱和球', () => {
    const rollers = SOLID_SHAPES.filter((s) => s.canRoll).map((s) => s.id);
    expect(rollers.sort()).toEqual(['cylinder', 'sphere'].sort());
  });

  it('对称标注齐全（三角形与平行四边形不对称，其余对称）', () => {
    const byId = (id: ShapeId) => ALL_SHAPES.find((s) => s.id === id)!;
    expect(byId('triangle').symmetric).toBe(false);
    expect(byId('parallelogram').symmetric).toBe(false);
    expect(byId('rectangle').symmetric).toBe(true);
    expect(byId('circle').symmetric).toBe(true);
    expect(byId('cube').symmetric).toBe(true);
    expect(byId('sphere').symmetric).toBe(true);
  });
});

describe('makeRecognizeQuestion', () => {
  it('1000 次：题型合法、选项含答案且唯一', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeRecognizeQuestion(seededRng(i + 1));
      expect(['name', 'category', 'roll']).toContain(q.kind);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('名称题有 4 个选项；分类/滚动题为 2 个选项', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeRecognizeQuestion(seededRng(i + 7));
      if (q.kind === 'name') {
        expect(q.options).toHaveLength(4);
      } else {
        expect(q.options).toHaveLength(2);
      }
    }
  });

  it('答案与形状数据一致（分类/滚动）', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeRecognizeQuestion(seededRng(i + 13));
      const shape = ALL_SHAPES.find((s) => s.id === q.shapeId)!;
      if (q.kind === 'category') {
        expect(q.answer).toBe(shape.isFlat ? '平面图形' : '立体图形');
      }
      if (q.kind === 'roll') {
        const solid = SOLID_SHAPES.find((s) => s.id === q.shapeId)!;
        expect(q.answer).toBe(solid.canRoll ? '能滚动' : '不能滚动');
      }
    }
  });

  it('滚动题只会出现在立体图形上', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeRecognizeQuestion(seededRng(i + 31));
      if (q.kind === 'roll') {
        expect(SOLID_SHAPES.some((s) => s.id === q.shapeId)).toBe(true);
      }
    }
  });

  it('注入 rng 可复现：同种子生成同题', () => {
    const a = makeRecognizeQuestion(seededRng(99));
    const b = makeRecognizeQuestion(seededRng(99));
    expect(a).toEqual(b);
  });
});

describe('makeCountCubesQuestion', () => {
  it('1000 次：答案等于各列之和，选项含答案且唯一为 4 个', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeCountCubesQuestion(seededRng(i + 3));
      expect(q.answer).toBe(q.columns.reduce((a, b) => a + b, 0));
      expect(q.options).toContain(q.answer);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('列数与每列高度在合理范围内，且均为正', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeCountCubesQuestion(seededRng(i + 5));
      expect(q.columns.length).toBeGreaterThanOrEqual(2);
      expect(q.columns.length).toBeLessThanOrEqual(4);
      for (const h of q.columns) {
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('makeSymmetryQuestion', () => {
  it('1000 次：选项固定为「是/否」，答案与形状对称标注一致', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeSymmetryQuestion(seededRng(i + 9));
      expect(new Set(q.options)).toEqual(new Set(['否', '是']));
      const shape = ALL_SHAPES.find((s) => s.id === q.shapeId)!;
      expect(q.answer).toBe(shape.symmetric ? '是' : '否');
    }
  });
});

describe('makeAngleQuestion', () => {
  it('1000 次：选项为三角名且含答案、唯一为 3 个', () => {
    for (let i = 0; i < 1000; i++) {
      const q = makeAngleQuestion(seededRng(i + 17));
      expect(new Set(q.options)).toEqual(new Set(['锐角', '直角', '钝角']));
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
    }
  });

  it('答案与角的类型一致', () => {
    for (let i = 0; i < 300; i++) {
      const q = makeAngleQuestion(seededRng(i + 23));
      const nameOf = { right: '直角', acute: '锐角', obtuse: '钝角' } as const;
      // answer 必须是指定类型对应的中文名
      expect(['直角', '锐角', '钝角']).toContain(q.answer);
      // 通过 kind 反查应等于 answer
      if (q.kind === 'right') expect(q.answer).toBe(nameOf.right);
      if (q.kind === 'acute') expect(q.answer).toBe(nameOf.acute);
      if (q.kind === 'obtuse') expect(q.answer).toBe(nameOf.obtuse);
    }
  });
});
