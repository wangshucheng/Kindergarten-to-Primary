# AGENTS.md —— 幼升小游戏合集（youxiao-games）

> 本文件面向 AI 编码代理，假定读者对本项目一无所知。
> 项目语言：代码注释、文档、提交说明均使用**中文**，请保持一致。

## 1. 项目概述

**youxiao-games** 是一款面向幼升小（5~7 岁）儿童的**纯前端教育游戏合集网页版**，包含六大学习模块、约 30 个益智小游戏：

| 模块 key | 名称 | 代表玩法 |
|---|---|---|
| `math` | 数学乐园 | 凑十法、加减连连看、数字合成、数独、华容道、数字地雷、乘法口诀、速算擂台、应用题 |
| `pinyin` | 拼音王国 | 声母韵母配对、拼读变体、听音选拼音 |
| `hanzi` | 汉字天地 | 翻牌记忆、连线匹配、更多识字玩法 |
| `english` | 英语小镇 | 字母大小写、单词图文、句子填空、对战、砖块、赶鹅 |
| `poetry` | 必背古诗文 | 18 首必背古诗文 |
| `geometry` | 图形与几何 | 认图形、拼搭计数、对称、角分类、三视图等 |

核心约束（来自 `docs/prd-youxiao-games.md` 与 `docs/architecture-youxiao-games.md`）：

- **纯前端零后端**：全部逻辑在浏览器运行，进度用 localStorage 持久化。
- **零素材依赖**：音效由 Web Audio API 程序化合成（`src/sound/SoundManager.ts`），朗读用 Web Speech API（`src/sound/TtsManager.ts`）；唯一的外部素材是预生成的单词音频/图片（见 `public/audio/words`、`public/images/words`）。
- **GitHub Pages 可部署**：HashRouter + `base: './'`，深链刷新不 404。
- **移动端触摸优先**：Pointer Events 统一鼠标/触摸，触控区 ≥ 44×44px。
- **内容 JSON 驱动**：字表/词表/题库来自 `src/data/*.json`，改内容不改代码。

仓库内另有一个**微信小程序移植版** `miniprogram/`（Taro 3 + React），与 Web 版通过平台抽象层共享业务代码，详见 `miniprogram/MINIPROGRAM_MIGRATION.md`。

## 2. 技术栈

- **构建**：Vite 5 + TypeScript 5.6（`strict: true`，`noEmit`，bundler 模块解析）
- **框架**：React 18 + react-router-dom 6（**HashRouter**）
- **样式**：Tailwind CSS 3 + 自研卡通组件（**明确弃用 MUI**，见架构文档 §1.1）；主题 token 在 `tailwind.config.js` 与 `src/theme/tokens.ts`（马卡龙色系 peach/mint/sky/lemon/cream/ink）
- **状态**：zustand 5 + React Context（`src/state/ScoreContext.tsx`、`ProgressStore.ts`）；无 Redux
- **数据校验**：zod 4（Web 版 `package.json` 用 `^4.4.3`；小程序版仍用 zod 3，注意区分）
- **测试**：vitest 3，`environment: 'node'`，仅收集 `src/**/*.test.ts`
- 无 ESLint / Prettier 配置文件——代码风格以现有代码为准

## 3. 常用命令

```bash
# Web 版（仓库根目录）
npm run dev       # Vite 开发服务器
npm run build     # tsc 类型检查 + vite build，产物在 dist/
npm run preview   # 预览构建产物
npm test          # vitest run（CI 部署门禁，必须全绿）

# 单跑某个测试
npx vitest run src/__tests__/makeTen.test.ts

# 数据/资产生成脚本（仅依赖 Node 内置模块，直接 node 运行）
node scripts/check-emojis.mjs      # 校验数据与游戏注册表中的 emoji 是否可显示
node scripts/genVocab.mjs          # 从 content/*.md 重新生成英语词汇/句型数据层
node scripts/genWordAudios.mjs     # 批量生成单词朗读 mp3（有道 TTS，增量，--dry-run 预览）
node scripts/genWordImages.mjs     # 批量生成单词配图（需 TRAE text_to_image 环境）

# 小程序版（在 miniprogram/ 目录下，独立 npm 项目）
cd miniprogram && npm run build:weapp   # Taro 构建 + inline-wxss
cd miniprogram && npm run dev:weapp     # watch 模式
```

## 4. 目录结构与模块划分

```
src/
  main.tsx / App.tsx / router.tsx   # 入口；路由表：/ → /:module → /:module/:gameId
  pages/          # HomePage / ModulePage / GamePage（路由级 lazy + Suspense 骨架屏）
  components/     # 共享 UI：GameShell（游戏外壳：加载/结算/存档）、HUD、Button、Card、
                  # CardGrid、Modal、StarRating、ProgressBar、ErrorBoundary 等
  games/
    types.ts      # 核心契约：GameConfig / GameProps / GameResult / ModuleKey / Priority
    registry.ts   # 游戏注册表：汇总各模块 games 数组，提供 getGame/getModules/getModuleGames
    lazyGame.ts   # lazyGame(loader, exportName)：把命名导出组件包成可 preload 的 React.lazy
    _shared/      # 跨模块复用的玩法引擎：match3（消消乐）、brick（砖块）、goose（赶鹅）、matchDetector
    math/ pinyin/ hanzi/ english/ poetry/ geometry/   # 每模块一个 index.ts 导出 games: GameConfig[]
  data/
    types.ts      # 题库根契约（SubjectKey 唯一定义于此）
    schemas.ts    # zod schema
    loader.ts     # DataLoader：合并 base JSON 与 ext/full 扩充 JSON（主键去重、ext 优先、模块级缓存）
    sampler.ts    # 按 level/seed 采样题目
    generators/   # QuestionGenerator 门面：genHanzi / genExpression / genLogic
    *.json        # hanzi / english / pinyin / math 的 base 与 ext 数据 + config.json（模块元数据）
  sound/          # SoundManager（Web Audio 合成音效）、TtsManager、useTTS、ttsLang
  state/          # ScoreContext（计分/连击/关卡）、ProgressStore（进度/成就/家长报告，localStorage）
  platform/       # 平台抽象层：storage / tts / audio / pointer，Web 与小程序双端同构（isMiniProgram 检测）
  theme/          # ThemeProvider + tokens
  utils/          # rng（种子化随机）、shuffle、gameLoop、motion、useDrag
  __tests__/      # 全部单测集中于此（命名 xxx.test.ts）
```

配套目录：

- `miniprogram/` —— Taro 3 微信小程序版，独立 `package.json`，`src/platform` 从 Web 版复制适配。
- `content/` —— 词汇/句型/乘法表/几何/诗歌等内容的 Markdown 源文档，`genVocab.mjs` 的输入。
- `public/` —— 静态资产：`audio/words/*.mp3`（约 500 个）、`images/words/*.png`（约 500 张）、`404.html`（SPA 回退，内容同 index.html）、`.nojekyll`。
- `docs/` —— PRD、架构文档、CODE_WIKI（最详尽的代码导览）、类图/时序图（mermaid）。
- `scripts/` —— 数据与资产生成脚本（见 §3）。
- `dist/` —— 构建产物，**勿手改**。

## 5. 关键架构约定（改动前必读）

### 新增一个游戏

1. 在对应模块下建目录（如 `src/games/math/MyGame/`），组件命名 `XxxGame.tsx`。
2. **游戏逻辑与 UI 分离**：纯逻辑放 `xxxLogic.ts`（不依赖浏览器 API，可在 node 环境单测），组件只做渲染与交互。
3. 组件接收 `GameProps`（`config` / `sound` / `tts` / `onComplete` / `onExit`），结束时通过 `onComplete(GameResult)` 上报分数/星级/知识点。
4. 在模块的 `index.ts` 里用 `lazyGame(() => import('./MyGame/MyGame'), 'MyGame')` 注册进 `games` 数组（含 `id`/`module`/`title`/`icon`/`priority`，内容驱动玩法另加 `subject`/`mode`）。`registry.ts` 会自动汇总，**无需改路由**。
5. 为新逻辑在 `src/__tests__/` 补单测；改完跑 `node scripts/check-emojis.mjs` 确认图标 emoji 合法。

### 数据层

- 所有 JSON 经 `loader.ts` 的 zod schema 运行时校验（**禁止** `as unknown as` 强转）；base 与 ext 按主键合并，ext 优先，结果模块级缓存。
- 测试需重置缓存时用 `__resetLoaderCache()`。
- 随机题目/棋盘一律用 `src/utils/rng.ts` 的**种子化 RNG**（同种子可复现），测试依赖这一点，不要用裸 `Math.random()`。

### 平台抽象

- 业务代码只依赖 `src/platform` 导出的接口，**不直接调用** `localStorage` / `wx.*` / `speechSynthesis` 等宿主 API，保证小程序端零改动复用。

### 样式与交互

- 只用 Tailwind 工具类 + `tailwind.config.js` 里的自定义 token/动画（pop/wiggle/shake/fadeInUp 等），不引入组件库。
- 低龄 UI：大圆角、按压回弹（`active:scale`）、触控目标 ≥ 44px。
- 音效经 `SoundManager.play(SoundType)`（`click | correct | wrong | win | levelup`），朗读经 `TtsManager`/`useTTS`，支持全局静音。

## 6. 测试策略

- 框架：vitest，`environment: 'node'`，只匹配 `src/**/*.test.ts`；所有测试集中在 `src/__tests__/`。
- 测试对象以**纯逻辑函数**为主：棋盘生成不变量（如凑十法"牌可两两凑十"）、生成器、采样器、loader 合并、注册表完整性（`registration.*.test.ts` 保证每个注册的游戏可加载）、回归测试（`regression.issues.test.ts`）。
- 命令：`npm test`（全量）；该命令是 CI 部署的前置门禁，**提交前必须全绿**。
- 无组件渲染/DOM 测试，无 e2e 测试（小程序端另有 jest + miniprogram-automator 配置，在 `miniprogram/` 内）。

## 7. 构建与部署

- CI：`.github/workflows/deploy.yml`——push 到 `main`/`master`（或手动触发）→ `npm ci` → `npm test` → `npm run build` → `actions/deploy-pages` 发布 `dist/` 到 GitHub Pages。仓库 Pages 源需选 "GitHub Actions"。
- 部署适配：`vite.config.ts` 设 `base: './'`（相对路径，适配任意 Pages 子路径）；路由用 HashRouter；`public/404.html` 做 SPA 回退双保险。
- 构建分包：`manualChunks` 拆分 react/router/zustand vendor 包；每个游戏经 `lazyGame` 独立 chunk，悬停卡片时 `preload()` 预取；页面级路由同样 lazy。
- 小程序版构建产物在 `miniprogram/dist/`，用微信开发者工具打开 `miniprogram/` 目录预览。

## 8. 安全与注意事项

- 无后端、无密钥、无用户账号；`localStorage` 仅存游戏进度/成就，**不要存敏感信息**。
- 外部输入只有本地 JSON 数据文件，统一走 zod 校验；新增数据文件须同步扩展 `src/data/schemas.ts`。
- 版权红线：运行时不加载任何外部音频/字体/图片素材；单词音频/图片为仓库内预生成资产。`genWordAudios.mjs` 直连有道 TTS（免费无 Key），`genWordImages.mjs` 依赖特定 AI 绘图环境，均**手动按需运行**，不在 CI 内执行。
- 面向儿童的合规：不采集任何个人信息，不接第三方统计/广告 SDK——新增依赖前先确认不违背此约束。
- 修改 `src/platform/` 的抽象接口时，必须同步检查 `miniprogram/src/platform/` 的对应实现。
