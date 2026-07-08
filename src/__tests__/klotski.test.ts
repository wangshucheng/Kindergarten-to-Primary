/**
 * klotski 纯逻辑测试（node 环境）。
 * 覆盖：KLOTSKI_LEVELS 结构、buildLevel 状态/谜题/知识点、isSolved、
 * canMove + applyMove、scramble、固定种子可复现、checkSort/checkClassify/checkPattern。
 */
import { describe, expect, it } from 'vitest';
import {
  KLOTSKI_LEVELS,
  buildLevel,
  isSolved,
  canMove,
  movableDirs,
  applyMove,
  scramble,
  validateState,
  checkSort,
  checkClassify,
  checkPattern,
  type KlotskiState,
} from '../games/math/klotski/klotskiLogic';
import type { LogicPuzzle } from '../data/generators';
import { createRng } from '../utils/rng';

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function firstBlockId(state: KlotskiState): string {
  return state.blocks[0].id;
}

function movableBlockIds(state: KlotskiState): string[] {
  return state.blocks.filter((b) => movableDirs(state, b.id).length > 0).map((b) => b.id);
}

// ---------------------------------------------------------------------------
// 1. KLOTSKI_LEVELS 结构
// ---------------------------------------------------------------------------

describe('KLOTSKI_LEVELS 结构', () => {
  it('3 关：网格 4×4→4×5→5×5，知识点 sort→classify→pattern，scramble 与 moveLimit 递增', () => {
    expect(KLOTSKI_LEVELS.length).toBe(3);
    expect(KLOTSKI_LEVELS.map((l) => l.rows)).toEqual([4, 4, 5]);
    expect(KLOTSKI_LEVELS.map((l) => l.cols)).toEqual([4, 5, 5]);
    expect(KLOTSKI_LEVELS.map((l) => l.kind)).toEqual(['sort', 'classify', 'pattern']);
    expect(KLOTSKI_LEVELS.map((l) => l.scramble)).toEqual([6, 8, 10]);
    expect(KLOTSKI_LEVELS.map((l) => l.moveLimit)).toEqual([30, 36, 42]);
  });
});

// ---------------------------------------------------------------------------
// 2. buildLevel —— 状态正确性
// ---------------------------------------------------------------------------

describe('buildLevel', () => {
  it('state 通过 validateState 且 isSolved=false', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const data = buildLevel(lv, 42);
      expect(validateState(data.state)).toBe(true);
      expect(isSolved(data.state)).toBe(false);
    }
  });

  it('puzzle.kind 与 level.kind 一致', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const data = buildLevel(lv, 789);
      expect(data.puzzle.kind).toBe(lv.kind);
    }
  });

  it('knowledgePoint = logic:${kind}', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const data = buildLevel(lv, 100);
      expect(data.knowledgePoint).toBe(`logic:${lv.kind}`);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. isSolved 判定
// ---------------------------------------------------------------------------

describe('isSolved', () => {
  it('已解布局（目标块在 goalTarget）→ true', () => {
    const data = buildLevel(KLOTSKI_LEVELS[0], 1);
    const goal = data.state.blocks.find((b) => b.isGoal)!;
    // 将目标块手动移到出口位置
    const solvedState: KlotskiState = {
      ...data.state,
      blocks: data.state.blocks.map((b) =>
        b.isGoal
          ? { ...b, r: data.state.goalTarget.r, c: data.state.goalTarget.c }
          : { ...b },
      ),
    };
    // 调整其他块避免冲突（直接将 goal 覆盖区域上的其他块移开）
    // 更简单的方法：直接断言目标块在出口即可
    expect(isSolved(solvedState)).toBe(true);
  });

  it('未解布局（目标块不在出口）→ false', () => {
    const data = buildLevel(KLOTSKI_LEVELS[0], 2);
    expect(isSolved(data.state)).toBe(false);
  });

  it('无目标块 → false', () => {
    const data = buildLevel(KLOTSKI_LEVELS[0], 3);
    const noGoal: KlotskiState = {
      ...data.state,
      blocks: data.state.blocks.map((b) => ({ ...b, isGoal: false })),
    };
    expect(isSolved(noGoal)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. canMove + applyMove
// ---------------------------------------------------------------------------

describe('canMove & applyMove', () => {
  it('applyMove 后 validateState 通过且 isSolved=false（未解态移动一或多块）', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const data = buildLevel(lv, 55);
      const ids = movableBlockIds(data.state);
      if (ids.length === 0) continue;
      const id = ids[0];
      const dirs = movableDirs(data.state, id);
      if (dirs.length === 0) continue;
      expect(canMove(data.state, id, dirs[0])).toBe(true);
      const moved = applyMove(data.state, id, dirs[0]);
      expect(validateState(moved)).toBe(true);
      expect(isSolved(moved)).toBe(false);
    }
  });

  it('非法方向 → applyMove 返回新对象但 isSolved 不变', () => {
    const data = buildLevel(KLOTSKI_LEVELS[0], 66);
    const notMovable = data.state.blocks.find((b) => movableDirs(data.state, b.id).length === 0);
    if (!notMovable) return; // 跳过（极小概率所有块都可移动）
    const moved = applyMove(data.state, notMovable.id, 'up');
    expect(validateState(moved)).toBe(true);
    expect(isSolved(moved)).toBe(isSolved(data.state));
  });
});

// ---------------------------------------------------------------------------
// 5. scramble —— 打乱后未解
// ---------------------------------------------------------------------------

describe('scramble', () => {
  it('打乱后 isSolved=false 且 validateState 通过', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const data = buildLevel(lv, 77);
      const rng = createRng(88);
      const scrambled = scramble(data.state, lv.scramble + 4, rng);
      expect(validateState(scrambled)).toBe(true);
      expect(isSolved(scrambled)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. buildLevel 固定 seed 可复现
// ---------------------------------------------------------------------------

describe('buildLevel 固定 seed 可复现', () => {
  it('相同 seed → 相同 block 布局', () => {
    for (const lv of KLOTSKI_LEVELS) {
      const a = buildLevel(lv, 999);
      const b = buildLevel(lv, 999);
      expect(a.state.blocks.length).toBe(b.state.blocks.length);
      for (let i = 0; i < a.state.blocks.length; i++) {
        expect(a.state.blocks[i].r).toBe(b.state.blocks[i].r);
        expect(a.state.blocks[i].c).toBe(b.state.blocks[i].c);
        expect(a.state.blocks[i].id).toBe(b.state.blocks[i].id);
      }
      expect(a.puzzle).toEqual(b.puzzle);
      expect(a.knowledgePoint).toBe(b.knowledgePoint);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. checkSort / checkClassify / checkPattern 门控校验
// ---------------------------------------------------------------------------

function sortPuzzle(ids: string[]): LogicPuzzle {
  return {
    kind: 'sort',
    items: ids.map((id) => ({ id, label: id })),
    target: { sortedIds: ids },
    knowledgePoint: 'logic:sort',
  };
}

function classifyPuzzle(groups: Record<string, string[]>): LogicPuzzle {
  const items = Object.entries(groups).flatMap(([grp, ids]) =>
    ids.map((id) => ({ id, label: id, group: grp })),
  );
  return {
    kind: 'classify',
    items,
    target: { groups, itemGroups: groups },
    knowledgePoint: 'logic:classify',
  };
}

function patternPuzzle(missing: string): LogicPuzzle {
  return {
    kind: 'pattern',
    items: [],
    target: { missingLabel: missing },
    knowledgePoint: 'logic:pattern',
  };
}

describe('checkSort', () => {
  it('正确顺序 → true', () => {
    expect(checkSort(sortPuzzle(['a', 'b', 'c']), ['a', 'b', 'c'])).toBe(true);
  });

  it('错误顺序 → false', () => {
    expect(checkSort(sortPuzzle(['a', 'b', 'c']), ['a', 'c', 'b'])).toBe(false);
  });
});

describe('checkClassify', () => {
  it('正确分组 → true', () => {
    const p = classifyPuzzle({ fruits: ['apple', 'pear'], colors: ['red', 'blue'] });
    expect(checkClassify(p, { fruits: ['apple', 'pear'], colors: ['red', 'blue'] })).toBe(true);
  });

  it('错误分组 → false', () => {
    const p = classifyPuzzle({ fruits: ['apple', 'pear'], colors: ['red', 'blue'] });
    expect(checkClassify(p, { fruits: ['apple'], colors: ['red', 'blue', 'pear'] })).toBe(false);
  });

  it('缺组 → false', () => {
    const p = classifyPuzzle({ fruits: ['apple', 'pear'], colors: ['red'] });
    expect(checkClassify(p, { fruits: ['apple', 'pear'] })).toBe(false);
  });
});

describe('checkPattern', () => {
  it('正确缺失项 → true', () => {
    expect(checkPattern(patternPuzzle('X'), 'X')).toBe(true);
  });

  it('错误缺失项 → false', () => {
    expect(checkPattern(patternPuzzle('X'), 'Y')).toBe(false);
  });
});
