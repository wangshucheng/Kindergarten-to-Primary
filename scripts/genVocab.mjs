/**
 * genVocab.mjs —— 从内容文档可靠生成 english 模块的数据层。
 *
 * 用法：node scripts/genVocab.mjs
 * 产出：
 *   src/games/english/vocabData.ts      —— VOCAB / VOCAB_BY_THEME（核心词汇 510）
 *   src/games/english/sentenceData.ts   —— SENTENCES（核心句型）
 *
 * 解析规则：
 *   - vocabulary.md：每个 `## ` 小节为一组主题；表格行形如 `| en | zh | pos | example |`；
 *     排除表头（| 英文 ...）与分隔行（|----|）；theme 取小节标题的中文短名。
 *   - sentence-patterns.md：每个 `## ` 小节为一个句型；捕获 `**公式**` 行与 `- ` 例句；
 *     例句按 ` — ` 切分，再按首个中文字符切分为 en / zh。
 *
 * 该脚本幂等、可复现，仅依赖 Node 内置 fs，不引入第三方包。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const contentDir = resolve(root, 'content');
const outDir = resolve(root, 'src/games/english');

/** 清洗 `## 一、数字 Numbers（num.）` → `数字` */
function cleanHeading(raw) {
  return raw
    .replace(/^##\s*/, '')
    .replace(/^[一二三四五六七八九十]+、/, '')
    .split(/\s|（/)[0]
    .trim();
}

/** 取首个中文字符索引（无中文返回 -1） */
function firstCjk(text) {
  return text.search(/[一-鿿]/);
}

// ---------------------------------------------------------------------------
// 1) vocabulary.md → vocabData.ts
// ---------------------------------------------------------------------------
function genVocab() {
  const text = readFileSync(resolve(contentDir, 'vocabulary.md'), 'utf8');
  const lines = text.split('\n');

  /** @type {Array<{en:string;zh:string;pos:string;example?:string;theme:string}>} */
  const vocab = [];
  const byTheme = new Map();

  let theme = '';
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      theme = cleanHeading(heading[1]);
      if (!byTheme.has(theme)) byTheme.set(theme, []);
      continue;
    }
    // 表格数据行：以 `| ` 开头且第二单元格为拉丁字母（排除表头/分隔行）
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/);
    if (!row) continue;
    if (!/^[A-Za-z]/.test(row[1].trim())) continue; // 表头（| 英文 ...）或异常行
    if (/^-+$/.test(row[1].trim().replace(/\|/g, ''))) continue; // 分隔行防御

    const en = row[1].trim();
    const zh = row[2].trim();
    const pos = row[3].trim();
    const example = row[4].trim() || undefined;
    const entry = { en, zh, pos, example, theme };
    vocab.push(entry);
    byTheme.get(theme).push(entry);
  }

  const themeKeys = [...byTheme.keys()];

  let out = '';
  out += `// 本文件由 scripts/genVocab.mjs 自动生成，请勿手改。\n`;
  out += `// 数据源：content/vocabulary.md（核心词汇，按主题分组）\n\n`;
  out += `export interface WordEntry {\n`;
  out += `  en: string;\n`;
  out += `  zh: string;\n`;
  out += `  pos: string;\n`;
  out += `  example?: string;\n`;
  out += `  theme: string;\n`;
  out += `}\n\n`;
  out += `export const VOCAB: WordEntry[] = [\n`;
  for (const e of vocab) {
    const ex = e.example === undefined ? '' : `, example: ${JSON.stringify(e.example)}`;
    out += `  { en: ${JSON.stringify(e.en)}, zh: ${JSON.stringify(e.zh)}, pos: ${JSON.stringify(e.pos)}${ex}, theme: ${JSON.stringify(e.theme)} },\n`;
  }
  out += `];\n\n`;

  out += `export const VOCAB_BY_THEME: Record<string, WordEntry[]> = {\n`;
  for (const k of themeKeys) {
    out += `  ${JSON.stringify(k)}: [\n`;
    for (const e of byTheme.get(k)) {
      const ex = e.example === undefined ? '' : `, example: ${JSON.stringify(e.example)}`;
      out += `    { en: ${JSON.stringify(e.en)}, zh: ${JSON.stringify(e.zh)}, pos: ${JSON.stringify(e.pos)}${ex}, theme: ${JSON.stringify(e.theme)} },\n`;
    }
    out += `  ],\n`;
  }
  out += `};\n`;

  // 主题 → 代表 emoji（用于图文游戏缺图时的可视化）
  out += `\n/** 主题代表 emoji：图文游戏缺少原图时回退使用 */\n`;
  out += `export const THEME_EMOJI: Record<string, string> = {\n`;
  const themeEmoji = {
    数字: '🔢', 颜色: '🎨', 家庭成员: '👪', 动物: '🐾', 食物与饮品: '🍎',
    身体部位: '💪', 学校用品: '✏️', 自然与天气: '🌿', 方位: '🧭', 时间: '⏰',
    课堂用语: '🏫', 节日: '🎉', 衣着: '👕', 运动: '⚽', 常见动词: '🏃',
    常见形容词: '✨', 常见名词: '📦',
  };
  for (const k of themeKeys) {
    out += `  ${JSON.stringify(k)}: ${JSON.stringify(themeEmoji[k] ?? '📘')},\n`;
  }
  out += `};\n`;

  writeFileSync(resolve(outDir, 'vocabData.ts'), out, 'utf8');
  return { count: vocab.length, themes: themeKeys.length };
}

// ---------------------------------------------------------------------------
// 2) sentence-patterns.md → sentenceData.ts
// ---------------------------------------------------------------------------
function genSentences() {
  const text = readFileSync(resolve(contentDir, 'sentence-patterns.md'), 'utf8');
  const lines = text.split('\n');

  /** @type {Array<{type:string;formula:string;examples:{en:string;zh:string}[]}>} */
  const sentences = [];
  let type = '';
  let formula = '';
  /** @type {{en:string;zh:string}[]} */
  let examples = [];

  const pushPattern = () => {
    if (type && formula) {
      sentences.push({ type, formula, examples });
    }
    formula = '';
    examples = [];
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      pushPattern();
      type = cleanHeading(heading[1]);
      continue;
    }
    const f = line.match(/\*\*(?:公式|规则)\*\*[：:]\s*(.+)$/);
    if (f) {
      formula = f[1].trim();
      continue;
    }
    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet && type) {
      // 按 ` — ` 切分多对；再按首个中文切分 en / zh
      const fragments = bullet[1].split(/\s—\s|｜/);
      for (const frag of fragments) {
        const idx = firstCjk(frag);
        if (idx <= 0) continue; // 纯英文或无中文，跳过
        const en = frag.slice(0, idx).trim().replace(/[。．.]$/, '');
        const zh = frag.slice(idx).trim();
        if (!en || !zh) continue;
        examples.push({ en, zh });
      }
    }
  }
  pushPattern();

  let out = '';
  out += `// 本文件由 scripts/genVocab.mjs 自动生成，请勿手改。\n`;
  out += `// 数据源：content/sentence-patterns.md（核心句型）\n\n`;
  out += `export interface SentencePattern {\n`;
  out += `  type: string;\n`;
  out += `  formula: string;\n`;
  out += `  examples: { en: string; zh: string }[];\n`;
  out += `}\n\n`;
  out += `export const SENTENCES: SentencePattern[] = [\n`;
  for (const s of sentences) {
    out += `  {\n`;
    out += `    type: ${JSON.stringify(s.type)},\n`;
    out += `    formula: ${JSON.stringify(s.formula)},\n`;
    out += `    examples: [\n`;
    for (const ex of s.examples) {
      out += `      { en: ${JSON.stringify(ex.en)}, zh: ${JSON.stringify(ex.zh)} },\n`;
    }
    out += `    ],\n`;
    out += `  },\n`;
  }
  out += `];\n`;

  writeFileSync(resolve(outDir, 'sentenceData.ts'), out, 'utf8');
  return { count: sentences.length, examples: sentences.reduce((n, s) => n + s.examples.length, 0) };
}

mkdirSync(outDir, { recursive: true });
const v = genVocab();
const s = genSentences();
console.log(`vocabData.ts: VOCAB=${v.count} 条, 主题=${v.themes} 组`);
console.log(`sentenceData.ts: SENTENCES=${s.count} 类, 例句=${s.examples} 条`);
