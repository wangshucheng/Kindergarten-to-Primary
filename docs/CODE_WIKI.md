# 幼升小游戏合集 · Code Wiki

&gt; 项目：youxiao-games（幼升小游戏合集网页版）
&gt; 版本：v1.0.0
&gt; 架构：纯前端 SPA · GitHub Pages 可部署 · 移动端触摸优先 · 马卡龙卡通风格

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [技术栈与依赖](#4-技术栈与依赖)
5. [核心模块职责](#5-核心模块职责)
6. [关键类与函数](#6-关键类与函数)
7. [数据层设计](#7-数据层设计)
8. [状态管理](#8-状态管理)
9. [音效与 TTS 系统](#9-音效与-tts-系统)
10. [游戏注册与路由系统](#10-游戏注册与路由系统)
11. [游戏模块详解](#11-游戏模块详解)
12. [共享 UI 组件](#12-共享-ui-组件)
13. [工具函数](#13-工具函数)
14. [运行方式与构建部署](#14-运行方式与构建部署)
15. [开发规范与约定](#15-开发规范与约定)

---

## 1. 项目概述

**youxiao-games** 是一款面向幼升小儿童的纯前端教育游戏合集，包含数学、拼音、汉字、英语、古诗文、图形几何六大学习模块，共 **30** 个益智小游戏。

### 核心特性

- **纯前端零后端**：全部逻辑在浏览器运行，数据通过 localStorage 持久化
- **零素材依赖**：音效使用 Web Audio API 程序化合成，朗读使用浏览器内置 Web Speech API
- **GitHub Pages 可部署**：HashRouter + 相对路径 `base: './'`，深链刷新不 404
- **代码分割懒加载**：每个游戏独立 chunk，悬停预取，首屏体积小
- **移动端优先**：Pointer Events 统一鼠标/触摸，触控区 ≥ 44×44px
- **内容 JSON 驱动**：字表/词表/题库来自 JSON 文件，新增内容无需改代码
- **成就系统**：本地存档最高分、星级、知识点、勋章、成就解锁

---

## 2. 整体架构

### 架构分层

```
┌──────────────────────────────────────────────────────────────┐
│                        Pages 层                              │
│  HomePage → ModulePage → GamePage                            │
├──────────────────────────────────────────────────────────────┤
│                    Components 层                             │
│  GameShell · HUD · Modal · Button · Card · StarRating · ...  │
├──────────────────────────────────────────────────────────────┤
│                      Games 层                                │
│  math/ · pinyin/ · hanzi/ · english/ · poetry/ · geometry/   │
│  └── _shared/  (共享玩法: match3 · brick · goose)             │
├──────────────────────────────────────────────────────────────┤
│                     State / Sound 层                         │
│  ScoreContext · ProgressStore · SoundManager · TtsManager    │
├──────────────────────────────────────────────────────────────┤
│                       Data 层                                │
│  loader · sampler · schemas(Zod) · generators · *.json       │
├──────────────────────────────────────────────────────────────┤
│                       Utils 层                               │
│  rng · shuffle · gameLoop · motion · useDrag                 │
├──────────────────────────────────────────────────────────────┤
│                      Theme 层                                │
│  tokens(颜色/阴影/动效) · ThemeProvider · Tailwind CSS        │
└──────────────────────────────────────────────────────────────┘
```

### 核心数据流

```
用户 → 路由(HashRouter) → 页面组件 → GameShell
       ↓                                    ↓
  注册表查 GameConfig              注入 sound/tts/onComplete
       ↓                                    ↓
  懒加载游戏组件 ← Suspense → ScoreProvider (分数/连击/知识点)
       ↓                                    ↓
  游戏逻辑 → sound.play() → 交互反馈        ↓
       ↓                              onComplete(GameResult)
  sampler/loader 取题                      ↓
       ↓                            saveResult → localStorage(ProgressStore)
  generators 出题                          ↓
                                     结算 Modal(星级/再玩/返回)
```

---

## 3. 目录结构

```
youxiao-games/
├── .gen/                        # 内容生成脚本
├── .github/workflows/           # CI/CD (deploy.yml - GitHub Pages 自动部署)
├── content/                     # 额外 Markdown 内容
├── docs/                        # 项目文档
│   ├── architecture-youxiao-games.md
│   ├── CODE_WIKI.md             # ← 本文件
│   └── ...
├── public/                      # 静态资源 (404.html SPA 回退)
├── scripts/                     # 构建辅助脚本
├── src/
│   ├── __tests__/               # Vitest 单元测试 (60+ 测试文件)
│   ├── components/              # 共享 UI 组件 (16 个)
│   ├── data/                    # 数据层
│   │   ├── generators/          # 题目生成器
│   │   ├── *.json               # 内容数据
│   │   ├── loader.ts            # 数据聚合(base+ext合并)
│   │   ├── sampler.ts           # 随机抽题
│   │   ├── schemas.ts           # Zod 运行时校验
│   │   └── types.ts             # 数据类型契约
│   ├── games/                   # 游戏模块(核心)
│   │   ├── _shared/             # 跨学科共享玩法(match3/brick/goose)
│   │   ├── math/                # 数学乐园(11 游戏)
│   │   ├── pinyin/              # 拼音王国(3 游戏)
│   │   ├── hanzi/               # 汉字天地(6 游戏)
│   │   ├── english/             # 英语小镇(8 游戏)
│   │   ├── poetry/              # 必背古诗文(1 游戏)
│   │   ├── geometry/            # 图形与几何(1 游戏)
│   │   ├── lazyGame.ts          # 带预取的懒加载包装器
│   │   ├── registry.ts          # 游戏注册表(唯一真相来源)
│   │   └── types.ts             # 游戏类型定义
│   ├── pages/                   # 路由页面 (Home/Module/Game)
│   ├── sound/                   # 音效与 TTS
│   ├── state/                   # 状态管理 (ScoreContext/ProgressStore)
│   ├── theme/                   # 主题系统 (tokens/ThemeProvider)
│   ├── utils/                   # 工具函数 (rng/shuffle/gameLoop等)
│   ├── App.tsx · main.tsx · router.tsx
│   └── index.css
├── index.html · package.json · vite.config.ts · tailwind.config.js
└── tsconfig.json · vitest.config.ts
```

---

## 4. 技术栈与依赖

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | ^18.3.1 | UI 框架 |
| react-dom | ^18.3.1 | DOM 渲染 |
| react-router-dom | ^6.26.2 | HashRouter 路由(SPA + GitHub Pages) |
| zustand | ^5.0.14 | 全局状态管理(进度/成就持久化) |
| zod | ^4.4.3 | 运行时数据校验(JSON 数据 + localStorage 迁移) |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| vite | ^5.4.8 | 构建工具(快/HMR/代码分割) |
| @vitejs/plugin-react | ^4.3.2 | React 支持 |
| typescript | ^5.6.2 | 类型系统 |
| tailwindcss | ^3.4.13 | 原子化 CSS |
| postcss + autoprefixer | ^8.4.47 / ^10.4.20 | CSS 处理 |
| vitest | ^3.0.0 | 单元测试框架 |

### 浏览器原生 API（无第三方库）

- **Web Audio API** (OscillatorNode) → 程序化音效合成
- **Web Speech API** (speechSynthesis) → 离线 TTS 朗读
- **Pointer Events** → 统一鼠标/触摸交互
- **localStorage** → 进度持久化

---

## 5. 核心模块职责

### 入口与路由

| 文件 | 职责 |
|------|------|
| [main.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/main.tsx) | React 挂载根节点；包裹 ErrorBoundary、HashRouter、ThemeProvider |
| [App.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/App.tsx) | 根组件，委托给 AppRoutes |
| [router.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/router.tsx) | 路由表：`/`首页、`/:module`模块页、`/:module/:gameId`游戏页；全部懒加载+Suspense骨架 |

路由使用 **HashRouter**（`/#/math/make-ten`），避免 GitHub Pages 刷新 404；`base: './'` 保证资源相对路径正确。

### 页面层

| 文件 | 职责 |
|------|------|
| [HomePage.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/pages/HomePage.tsx) | 首页：六大模块入口卡片 + 星星总数 + 最近游玩 |
| [ModulePage.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/pages/ModulePage.tsx) | 模块页：游戏列表卡片，悬停预取chunk，显示最高分/星级 |
| [GamePage.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/pages/GamePage.tsx) | 游戏页：按 gameId 从注册表取 GameConfig，渲染 GameShell |

### 游戏外壳 GameShell

[GameShell.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components/GameShell.tsx) 是所有游戏的统一运行容器：

- 创建并管理 SoundManager / TtsManager 实例（useRef 单例）
- 包裹 ScoreProvider（单局分数/连击/知识点/勋章）
- 首次 pointerdown 解锁 AudioContext（浏览器自动播放策略）
- 接收 onComplete，统一落盘 ProgressStore 并弹出结算 Modal
- 支持"再玩一次"（key 重挂载彻底重置状态）
- 卸载时 dispose 音频资源，防止泄漏

### 游戏注册表 registry

[registry.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/registry.ts) 是游戏注册的**唯一真相来源**：

- 从各模块 `index.ts` 聚合 GameConfig[]
- 提供查询 API：`getGame(id)`、`getModules()`、`getModuleGames(module)`
- 从 data/config.json（经 Zod 校验）加载模块元数据
- 按 priority (P0/P1/P2) 排序游戏列表

### 懒加载系统 lazyGame

[lazyGame.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/lazyGame.ts) 封装 React.lazy，增加 preload 预取能力：

- 每个游戏被 Vite 拆成独立 chunk，进入对应路由时才下载
- `preload()` 方法可在用户悬停/按下游戏卡片时提前下载 chunk

### 状态管理

**单局运行期：ScoreContext** ([ScoreContext.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/state/ScoreContext.tsx))
- 基于 useReducer + Context，管理单局分数/连击/失误/回合/知识点/勋章
- 同步镜像 refs 避免 reducer 闭包滞后导致落盘旧值

**全局持久化：ProgressStore** ([ProgressStore.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/state/ProgressStore.ts))
- 基于 zustand + persist 中间件
- localStorage 持久化 (key: `yyx.progress.v2`)，带 schema version
- Zod 校验 + 损坏数据抢救迁移 + 跨标签页同步

---

## 6. 关键类与函数

### SoundManager

[SoundManager.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/SoundManager.ts) —— Web Audio API 程序化音效引擎

```typescript
class SoundManager {
  resume(): void                // 解锁 AudioContext(须在用户手势中调用)
  toggle(): boolean             // 开关音效,返回新状态
  isEnabled(): boolean
  play(type: SoundType): void   // 播放音效(click/correct/wrong/win/levelup)
  dispose(): void               // 释放资源(组件卸载时调用)
}
```

音效参数在 [soundPresets.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/soundPresets.ts) 中定义，全部使用 OscillatorNode 合成，零音频素材。

### TtsManager

[TtsManager.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/TtsManager.ts) —— 基于 Web Speech API 的离线朗读

```typescript
class TtsManager {
  toggle(): boolean
  isEnabled(): boolean
  speak(text, opts?: { lang?, rate?, onEnd? }): void  // 朗读文本
  stop(): void                                        // 立即停止
  dispose(): void                                     // 释放资源
}
```

特性：speak 前 cancel 上一条避免语音堆积；按语言智能挑选音色；无 speechSynthesis 环境安全降级。

### lazyGame

```typescript
function lazyGame<M>(
  loader: () => Promise<M>,
  exportName: keyof M & string,
): PreloadableGame
```

用法：`const MakeTenGame = lazyGame(() => import('./MakeTen/MakeTenGame'), 'MakeTenGame');`

### DataLoader

[loader.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/loader.ts) —— 数据聚合（合并 base + ext 扩充包）

- `loadHanzi(): HanziEntry[]` —— 按 char 去重合并 hanzi.json + hanzi-ext.json
- `loadEnglish(): EnglishWord[]` —— 按 word 去重合并
- `loadPinyin(): PinyinData` —— initials/finals/syllables 并集合并
- `loadMathContent(): MathContent` —— 浅合并 math.json + math-content.json

模块级缓存确保 JSON 只解析一次。

### Sampler

[sampler.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/sampler.ts) —— 随机抽题工具

- `pickRandom<T>(arr, rng?): T` —— 随机取一项
- `pickN<T>(arr, n, rng?): T[]` —— 取不重复 n 项（洗牌后截取）
- `pickByLevel<T>(arr, level, rng?): T[]` —— 按 level 过滤并洗牌
- `pickByTag<T>(arr, tag, rng?): T[]` —— 按 tag 过滤并洗牌

### 工具函数

**rng.ts** ([rng.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils/rng.ts))
- `createRng(seed): Rng` —— mulberry32 种子随机（可复现）
- `randomInt(rng, min, max): number` —— [min, max] 闭区间整数
- `weightedPick<T>(arr, weights, rng?): T` —— 按权重抽取

**shuffle.ts** ([shuffle.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils/shuffle.ts))
- `shuffle<T>(arr, rng?): T[]` —— Fisher-Yates 洗牌（返回新数组）
- `pick<T>(arr, rng?): T` —— 随机取一项
- `sample<T>(arr, n, rng?): T[]` —— 取不重复 n 项

---

## 7. 数据层设计

### Zod 运行时校验

所有 JSON 数据和 localStorage 存档都经过 [schemas.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/schemas.ts) 的 Zod schema 校验，替代 `as unknown as` 强制断言。

核心 Schema：
- `HanziEntrySchema` / `EnglishWordSchema` / `SyllableSchema`
- `AddSubtractRuleSchema` / `MathContentSchema`
- `GameProgressRecordSchema` / `ProgressStateSchema`（带 SAVE_VERSION）
- `AchievementDefSchema` / `ModuleMetaSchema` / `ConfigSchema`

### 内容数据文件

| 文件 | 内容 |
|------|------|
| hanzi.json / hanzi-ext.json | 基础/扩充汉字（char/pinyin/emoji/meaning） |
| english.json / english-ext.json | 基础/扩充英语单词 |
| pinyin.json / pinyin-full.json | 基础/完整拼音体系 |
| math.json / math-content.json | 基础/扩充数学规则 |
| config.json | 模块元信息、成就定义 |

### 题目生成器

[generators/index.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/generators/index.ts) 门面：
- `QuestionGenerator.hanzi = genHanzi` —— 汉字题目生成
- `QuestionGenerator.math = genExpression` —— 数学算式生成
- `QuestionGenerator.logic = genLogic` —— 逻辑题生成

---

## 8. 状态管理

### 状态分层

| 状态 | 作用域 | 方案 | 持久化 |
|------|--------|------|--------|
| 单局分数/连击/失误/知识点/勋章 | 单局游戏内 | ScoreContext (useReducer) | 否（结束时落盘） |
| 最高分/星级/游玩次数/最近游玩/成就 | 跨局全局 | Zustand + persist | localStorage (yyx.progress.v2) |
| 路由 | URL | react-router-dom | URL hash |
| 主题 | 全局 | ThemeProvider (Context) | 否 |

### ProgressStore 存档结构

```typescript
interface ProgressState {
  records: Record<string, GameProgressRecord>;  // 每个游戏的进度
  unlocked: string[];                           // 已解锁成就 id
  totalStars: number;                           // 总星数
  recent: string[];                             // 最近游玩 gameId(最多6个)
  knowledgePoints: string[];                    // 全局收集的知识点
  medals: string[];                             // 全局解锁的勋章
}

interface GameProgressRecord {
  gameId: string;
  bestScore: number;
  stars: number;        // 0~3
  plays: number;
  lastPlayed: number;   // timestamp
  knowledgePoints: string[];
  medals: string[];
}
```

### 成就列表

| id | 解锁条件 |
|----|----------|
| first-win | 任意游戏获得 ≥1 星 |
| star-three | 任意游戏获得 3 星 |
| explorer | 玩过 ≥12 个游戏 |
| persistent | 总游玩次数 ≥30 |
| perfect | 任意游戏 3 星且游玩 ≥1 次 |
| medal-first | 获得首个勋章 |
| medal-collector | 获得 ≥5 个勋章 |
| scholar | 收集 ≥10 个知识点 |

---

## 9. 音效与 TTS 系统

### 音效预设

| 类型 | 音乐特征 | 用途 |
|------|----------|------|
| click | 880Hz 三角波 80ms | 点击按钮/卡片 |
| correct | 523→659→784Hz 上行三音 sine 波 | 答对/匹配成功 |
| wrong | 196→147Hz 下行 square 波 | 答错/匹配失败 |
| win | 523→659→784→1047Hz 琶音 triangle 波 | 通关/结算 |
| levelup | 587→880Hz 上行 sawtooth | 升级/过关 |

### TTS 朗读

- 使用浏览器内置 `window.speechSynthesis`，完全离线
- 默认语速 0.9（儿童稍慢）
- 智能音色选择：zh-CN→普通话，zh-HK/zh-yue→粤语，en→英语(优先en-US)
- speak 前 cancel 上一条避免语音堆积

---

## 10. 游戏注册与路由系统

### 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 六大模块入口 |
| `/:module` | ModulePage | 模块游戏列表 |
| `/:module/:gameId` | GamePage | 具体游戏页 |
| `*` | → 重定向到 `/` | 404 兜底 |

`module` 取值：`math` / `pinyin` / `hanzi` / `english` / `poetry` / `geometry`

### GameConfig 接口

```typescript
interface GameConfig {
  id: string;                          // 唯一 id(URL路径用)
  module: ModuleKey;                   // 所属模块
  title: string;                       // 显示名
  icon: string;                        // emoji 图标
  priority: 'P0' | 'P1' | 'P2';       // 显示优先级
  component: ComponentType<GameProps>; // 渲染组件(支持lazy)
  subject?: SubjectKey;                // 学科键(供生成器分发)
  mode?: string;                       // 玩法模式
}

interface GameProps {
  config: GameConfig;
  sound: SoundManager;
  tts: TtsManager;
  onComplete: (r: GameResult) => void;
  onExit: () => void;
}

interface GameResult {
  score: number;
  passed: boolean;
  stars: number;       // 0~3
  durationMs: number;
  knowledgePoints?: string[];
  medals?: string[];
}
```

### 共享玩法（_shared）

| 共享玩法 | 目录 | 说明 |
|----------|------|------|
| 三消 (match3) | [games/_shared/match3/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/_shared/match3) | 经典三消，可配置任意 tile 内容 |
| 砖块配对 (brick) | [games/_shared/brick/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/_shared/brick) | 下落砖块配对 |
| 赶鹅配对 (goose) | [games/_shared/goose/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/_shared/goose) | 移动目标配对 |
| matchDetector | [matchDetector.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/_shared/matchDetector.ts) | 消除检测逻辑 |

---

## 11. 游戏模块详解

### 11.1 数学乐园 (math) — 11 个游戏

| id | 游戏名 | 目录 | 玩法说明 |
|----|--------|------|----------|
| make-ten | 凑十法 | [MakeTen/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/MakeTen) | 羊了个羊式层叠消除，选两数之和为10 |
| plus-minus-link | 加减连连看 | [PlusMinusLink/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/PlusMinusLink) | 连线算式与答案(不超过两折) |
| number-merge | 数字合成 | [NumberMerge/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/NumberMerge) | 2048式滑动合成 |
| sudoku | 数独 | [sudoku/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/sudoku) | 经典9×9数独(含候选数面板) |
| sudoku-letter | 字母数独 | [LetterSudoku/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/LetterSudoku) | 4×4/6×6字母数独 |
| sudoku-math | 算术数独 | [ArithmeticSudoku/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/ArithmeticSudoku) | 带加减提示的数独 |
| number-mines | 数字地雷 | [NumberMines/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/NumberMines) | 扫雷式数字推理 |
| klotski | 华容道 | [klotski/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/klotski) | 数字华容道滑块 |
| multiplication | 乘法口诀 | [Multiplication/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/Multiplication) | 乘法表练习 |
| mult-speed | 速算擂台 | [SpeedDrill/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/SpeedDrill) | 限时速算 |
| mult-word | 应用题闯关 | [WordProblem/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/math/WordProblem) | 图文应用题 |

### 11.2 拼音王国 (pinyin) — 3 个游戏

| id | 游戏名 | 目录 | 玩法说明 |
|----|--------|------|----------|
| pinyin-match | 声母韵母拼读 | [PinyinMatch/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/pinyin/PinyinMatch) | 声母×韵母配对拼读 |
| pinyin-variants | 拼读变体 | [PinyinVariants/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/pinyin/PinyinVariants) | 音节拼读变体练习 |
| pinyin-listen | 听音选拼音 | [ListenPick/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/pinyin/ListenPick) | TTS朗读后选对应拼音 |

### 11.3 汉字天地 (hanzi) — 6 个游戏

| id | 游戏名 | 目录 | 玩法说明 |
|----|--------|------|----------|
| flip-memory | 翻牌记忆 | [FlipMemory/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/hanzi/FlipMemory) | 翻牌配对(汉字+拼音) |
| connect-match | 连线匹配 | [ConnectMatch/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/hanzi/ConnectMatch) | 汉字与释义/图片连线 |
| more-hanzi | 趣味识字 | [MoreHanzi/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/hanzi/MoreHanzi) | 拓展识字玩法 |
| match-3 | 汉字消消乐 | _shared/match3 | 汉字三消(subject=hanzi) |
| brick-match-hanzi | 砖块配对 | _shared/brick | 汉字下落砖块配对 |
| goose-catch-hanzi | 赶鹅配对 | _shared/goose | 汉字赶鹅配对 |

### 11.4 英语小镇 (english) — 8 个游戏

| id | 游戏名 | 目录 | 玩法说明 |
|----|--------|------|----------|
| letter-case | 大小写配对 | [LetterCase/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/english/LetterCase) | 大写字母与小写字母配对 |
| word-image | 单词图文 | [WordImage/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/english/WordImage) | 单词与图片配对 |
| sentence-fill | 句子填空 | [SentenceFill/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/english/SentenceFill) | 简单句选词填空 |
| battle-quiz | 答题大作战 | [BattleQuiz/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/english/BattleQuiz) | 答对攻击类对战 |
| match-3-en | 英语消消乐 | _shared/match3 | 英语三消(subject=english) |
| brick-match | 砖块配对 | _shared/brick | 英语砖块配对 |
| goose-catch | 赶鹅配对 | _shared/goose | 英语赶鹅配对 |
| vocab-drill | 核心词汇 | [VocabDrill/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/english/VocabDrill) | 核心词汇练习 |

### 11.5 必背古诗文 (poetry) — 1 个游戏

| id | 游戏名 | 文件 | 玩法说明 |
|----|--------|------|----------|
| poetry-cards | 必背古诗文 | [PoetryGame.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/poetry/PoetryGame.tsx) | 18首必背古诗文学习(咏鹅/村居/咏柳等) |

古诗文数据在 [poems.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/poetry/poems.ts)。

### 11.6 图形与几何 (geometry) — 1 个游戏

| id | 游戏名 | 文件 | 玩法说明 |
|----|--------|------|----------|
| geometry-play | 图形与几何 | [GeometryGame.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/geometry/GeometryGame.tsx) | 认图形/拼搭计数/找对称/角分类/三视图/图形运动/长度单位 |

几何逻辑在 [geometryLogic.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/geometry/geometryLogic.ts)。

---

## 12. 共享 UI 组件

[components/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components) 目录共 16 个共享组件：

| 组件 | 文件 | 职责 |
|------|------|------|
| GameShell | GameShell.tsx | 游戏统一外壳(音频/计分/结算/存档) |
| HUD | HUD.tsx | 顶部栏(标题/分数/连击/音效开关/返回) |
| Button | Button.tsx | 按压回弹按钮(多变体：mint/peach/ghost等) |
| Card | Card.tsx | 通用卡片(图片/文字/拼音) |
| CardGrid | CardGrid.tsx | 配对类游戏共享网格布局 |
| Modal | Modal.tsx | 过关/失败弹窗(含星级/按钮) |
| StarRating | StarRating.tsx | 1~3星评分显示(支持动画) |
| ProgressBar | ProgressBar.tsx | 进度条 |
| Brick | Brick.tsx | 砖块组件(brick-match共享玩法) |
| GridBoard | GridBoard.tsx | 网格棋盘基础组件 |
| Spinner | Spinner.tsx | 加载旋转器(FullScreenLoader) |
| Skeleton | Skeleton.tsx | 骨架屏(SkeletonGrid等) |
| Slider | Slider.tsx | 滑块组件 |
| Reveal | Reveal.tsx | 入场动画包裹组件(错峰fadeIn/riseIn) |
| PageTransition | PageTransition.tsx | 路由页面切换动画 |
| ErrorBoundary | ErrorBoundary.tsx | 错误边界(崩溃降级UI) |

### 主题色板(马卡龙色系)

[tokens.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/theme/tokens.ts) 中定义：

| 色键 | 色值 | 用途 |
|------|------|------|
| peach | #FFB3C6 | 数学模块 |
| mint | #95E1C9 | 拼音模块 |
| sky | #A0D2FF | 汉字/几何模块 |
| lemon | #FFE066 | 英语模块 |
| cream | #FFF9F0 | 古诗文模块 |
| ink | #5A4636 | 主文字色 |
| inkSoft | #9C8775 | 次级文字 |

每个模块有专属柔和线性渐变（moduleGradients）用于大卡片背景。

---

## 13. 工具函数

[utils/](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils) 目录：

| 文件 | 核心导出 | 用途 |
|------|----------|------|
| rng.ts | createRng / randomInt / weightedPick | 可种子随机数生成 |
| shuffle.ts | shuffle / pick / sample | Fisher-Yates 洗牌与抽样 |
| gameLoop.ts | useGameLoop / useCountdown / formatTime | 游戏循环与倒计时 Hook |
| motion.ts | 动效工具函数 | CSS动效辅助 |
| useDrag.ts | useDrag Hook | 拖拽交互 |

---

## 14. 运行方式与构建部署

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 常用命令

```bash
# 安装依赖
npm install

# 开发模式 (启动 Vite dev server, 默认 http://localhost:5173)
npm run dev

# 类型检查 + 生产构建 (输出到 dist/)
npm run build

# 预览生产构建
npm run preview

# 运行单元测试 (Vitest)
npm run test
```

### 构建优化

[vite.config.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/vite.config.ts) 中配置：

- `base: './'` —— 相对路径，GitHub Pages 子路径部署不 404
- manualChunks 代码分割：
  - `react-vendor`: react + react-dom
  - `router-vendor`: react-router-dom
  - `state-vendor`: zustand
  - 每个游戏独立 chunk（由 lazyGame 自动拆分）
- chunkSizeWarningLimit: 500KB
- target: es2020

### GitHub Pages 自动部署

[.github/workflows/deploy.yml](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/.github/workflows/deploy.yml)：

- 触发：push 到 main 分支
- 步骤：npm ci → npm run build → peaceiris/actions-gh-pages 发布到 gh-pages 分支
- 仓库 Settings → Pages → 选 gh-pages 分支根目录

### public/404.html

内容与 index.html 相同，作为 SPA 回退双保险（某些 GitHub Pages 场景下 HashRouter 仍可能触发 404）。

---

## 15. 开发规范与约定

### 添加新游戏

1. 在对应模块目录下创建 `<GameName>/` 文件夹，包含 `<GameName>Game.tsx` 和可选的 `<gameName>Logic.ts`
2. 游戏组件接收 `GameProps`（config/sound/tts/onComplete/onExit）
3. 在模块的 `index.ts` 中用 `lazyGame()` 包装并注册到 games 数组
4. 游戏内通过 `useScore()` 读写分数/连击/知识点/勋章
5. 游戏结束时调用 `onComplete({ score, passed, stars, durationMs, knowledgePoints?, medals? })`
6. 交互反馈统一使用 `sound.play('click'/'correct'/'wrong')`
7. 需要朗读时使用 `tts.speak(text, { lang, rate, onEnd })`

### 命名规范

- 组件文件：`PascalCase.tsx`
- 逻辑/工具文件：`camelCase.ts`
- 内容数据：`kebab-case.json`
- 共享组件：`src/components/`
- 具体游戏：`src/games/<module>/<GameName>/`

### 音效调用约定

- **只允许**通过 `props.sound.play(type)` 触发，禁止直接 `new Audio()`
- 可选类型：click / correct / wrong / win / levelup
- GameShell 已在首次 pointerdown 时自动调用 `sound.resume()`，游戏无需关心

### 移动端触摸约定

- 统一使用 **Pointer Events**（onPointerDown/Up/Move），不分别绑定 mouse/touch
- 可点击元素最小触控区 ≥ 44×44px
- `touch-action: manipulation` 禁用双击缩放
- 需要拖拽时使用 `setPointerCapture`

### 内容驱动约定

- 所有题目/字表/词表来自 `src/data/*.json`，游戏逻辑只读 JSON、不内嵌硬编码内容
- 新增题目只需改 JSON + Zod schema，无需改代码

### 数据校验约定

- 所有外部数据（JSON 文件、localStorage）必须经过 Zod schema 校验
- 禁止使用 `as unknown as` 强制断言

### 测试约定

- 纯逻辑文件（gameLogic、utils、reducer、loader、sampler）必须写单元测试
- 测试文件放 `src/__tests__/`，命名 `*.test.ts`
- 运行：`npm run test`

---

## 附录：文件引用索引

| 类别 | 文件链接 |
|------|----------|
| 入口 | [main.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/main.tsx) · [App.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/App.tsx) · [router.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/router.tsx) |
| 游戏核心 | [types.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/types.ts) · [registry.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/registry.ts) · [lazyGame.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/games/lazyGame.ts) |
| 状态 | [ScoreContext.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/state/ScoreContext.tsx) · [ProgressStore.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/state/ProgressStore.ts) |
| 音效/TTS | [SoundManager.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/SoundManager.ts) · [TtsManager.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/TtsManager.ts) · [soundPresets.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/sound/soundPresets.ts) |
| 数据 | [loader.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/loader.ts) · [sampler.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/sampler.ts) · [schemas.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/schemas.ts) · [types.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/data/types.ts) |
| 组件 | [GameShell.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components/GameShell.tsx) · [HUD.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components/HUD.tsx) · [Button.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components/Button.tsx) · [Modal.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/components/Modal.tsx) |
| 工具 | [rng.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils/rng.ts) · [shuffle.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils/shuffle.ts) · [gameLoop.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/utils/gameLoop.ts) |
| 主题 | [tokens.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/theme/tokens.ts) · [ThemeProvider.tsx](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/src/theme/ThemeProvider.tsx) |
| 配置 | [package.json](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/package.json) · [vite.config.ts](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/vite.config.ts) · [tailwind.config.js](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/tailwind.config.js) · [tsconfig.json](file:///c:/Users/Administrator/WorkBuddy/2026-07-07-11-52-57/tsconfig.json) |
