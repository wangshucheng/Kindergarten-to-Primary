/**
 * genZhAudios.mjs —— 批量生成微信小程序端中文朗读音频（腾讯云 TTS）。
 *
 * 用法：
 *   node scripts/genZhAudios.mjs            # 生成全部缺失音频（增量）
 *   node scripts/genZhAudios.mjs --limit 5  # 限制数量（测试用）
 *   node scripts/genZhAudios.mjs --force    # 强制重新生成已存在的音频
 *   node scripts/genZhAudios.mjs --dry-run  # 只输出语料统计，不发请求、不写文件
 *
 * 产出：
 *   public/audio/zh/<hash>.mp3            —— hash = sha1_hex("zh-CN|" + key)
 *   miniprogram/src/data/zh-audios.json   —— key → 音频路径映射表（仅存实际存在的文件）
 *   其中 key = 规范化文本（trim + 折叠内部连续空白），
 *   与运行时 miniprogram/src/platform/ttsText.ts 的 normalizeTextKey 严格一致。
 *
 * 语料来源（全部枚举自 miniprogram/ 内文件，按规范化文本去重）：
 *   1. 古诗（games/poetry/poems.ts）：整首朗读串 + 每行单独一条
 *   2. 汉字（data/hanzi.json、hanzi-ext.json）：全部 char 字段值
 *   3. 拼音（data/pinyin.json、pinyin-full.json）：syllables[] 的 char 与 pinyin
 *   4. 应用题（games/math/WordProblem/wordProblemLogic.ts）：全部 stem
 *   5. 几何题干（games/geometry/geometryLogic.ts）：按模板组合 + 固定串
 *   6. 固定引导语（games/**\/*.tsx）：speakZh/speak 的中文串字面量实参
 *   7. math-content.json：所有含中文的字符串值
 *
 * 音频来源：腾讯云语音合成 TTS（API 3.0，TC3-HMAC-SHA256 签名，无第三方依赖）
 * 环境变量：
 *   TENCENT_SECRET_ID / TENCENT_SECRET_KEY  —— 必填（--dry-run 除外）
 *   TTS_VOICE                               —— 音色，默认 101016（智甜·女童声）
 *   TTS_SPEED                               —— 语速，可选（数字字符串）
 *
 * 增量生成：默认跳过已存在的音频，可用 --force 覆盖。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createHmac, randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 解析命令行参数
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opts = {
  limit: getArg(args, '--limit') ? parseInt(getArg(args, '--limit'), 10) : 0,
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
};

function getArg(arr, flag) {
  const i = arr.indexOf(flag);
  return i >= 0 && i + 1 < arr.length ? arr[i + 1] : null;
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
/** 还原 JS 字符串字面量中的转义字符（语料中基本只涉及 \' 与 \\） */
function unescapeJs(s) {
  return s.replace(/\\(.)/g, (_, c) => ({ "'": "'", '\\': '\\', n: '\n', r: '\r', t: '\t' })[c] ?? c);
}

/** 是否含中文字符 */
function hasChinese(s) {
  return /[\u4e00-\u9fff]/.test(s);
}

/** 规范化文本键：trim + 折叠内部连续空白为单个空格。
 *  与运行时 miniprogram/src/platform/ttsText.ts 的 normalizeTextKey 严格一致。 */
function normalizeKey(s) {
  return s.trim().replace(/\s+/g, ' ');
}

/** 规范化并过滤空串 */
function normalize(texts) {
  return texts.map(normalizeKey).filter((t) => t.length > 0);
}

/** 递归遍历 JSON 值，对所有对象字段执行 cb(key, value) */
function walkJson(node, cb) {
  if (Array.isArray(node)) {
    for (const item of node) walkJson(item, cb);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      cb(k, v);
      walkJson(v, cb);
    }
  }
}

// ---------------------------------------------------------------------------
// 语料 1：古诗（poems.ts，正则解析）
// 每首诗一条整首朗读串 `${title}。${author}。${lines.join('')}`，外加每行 text 一条
// ---------------------------------------------------------------------------
function collectPoems() {
  const file = resolve(root, 'miniprogram/src/games/poetry/poems.ts');
  const content = readFileSync(file, 'utf-8');

  // 按文件顺序捕获 title/author/text 三种键，遇到 title 即开启一首新诗
  const poems = [];
  let current = null;
  const re = /(title|author|text)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const [, key, raw] = m;
    const value = unescapeJs(raw);
    if (key === 'title') {
      current = { title: value, author: '', lines: [] };
      poems.push(current);
    } else if (key === 'author' && current) {
      current.author = value;
    } else if (key === 'text' && current) {
      current.lines.push(value);
    }
  }

  const texts = [];
  for (const p of poems) {
    texts.push(`${p.title}。${p.author}。${p.lines.join('')}`);
    texts.push(...p.lines);
  }
  return { texts, note: `整首 ${poems.length} + 单行 ${texts.length - poems.length}` };
}

// ---------------------------------------------------------------------------
// 语料 2：汉字（hanzi.json、hanzi-ext.json，JSON.parse 后收集全部 char 字段值）
// 其他可能被朗读的字段（word/text/meaning/measureWord 等）仅在 dry-run 报告，不计入主语料
// ---------------------------------------------------------------------------
const HANZI_EXTRA_KEYS = ['word', 'text', 'meaning', 'measureWord', 'label', 'name'];
const hanziExtra = {}; // key → Set(值)

function collectHanzi() {
  const texts = [];
  for (const name of ['hanzi.json', 'hanzi-ext.json']) {
    const file = resolve(root, 'miniprogram/src/data', name);
    const json = JSON.parse(readFileSync(file, 'utf-8'));
    walkJson(json, (key, value) => {
      if (typeof value !== 'string') return;
      if (key === 'char') {
        texts.push(value);
      } else if (HANZI_EXTRA_KEYS.includes(key) && hasChinese(value)) {
        (hanziExtra[key] ??= new Set()).add(value);
      }
    });
  }
  return { texts, note: '' };
}

// ---------------------------------------------------------------------------
// 语料 3：拼音（pinyin.json、pinyin-full.json，收集 syllables[] 的 char 与 pinyin）
// ---------------------------------------------------------------------------
function collectPinyin() {
  const texts = [];
  let syllableCount = 0;
  for (const name of ['pinyin.json', 'pinyin-full.json']) {
    const file = resolve(root, 'miniprogram/src/data', name);
    const json = JSON.parse(readFileSync(file, 'utf-8'));
    const syllables = Array.isArray(json.syllables) ? json.syllables : [];
    syllableCount += syllables.length;
    for (const s of syllables) {
      if (typeof s.char === 'string') texts.push(s.char);
      if (typeof s.pinyin === 'string') texts.push(s.pinyin);
    }
  }
  return { texts, note: `音节 ${syllableCount} 个 × (char + pinyin)` };
}

// ---------------------------------------------------------------------------
// 语料 4：应用题（wordProblemLogic.ts，正则提取全部 stem: '...'）
// ---------------------------------------------------------------------------
function collectWordProblems() {
  const file = resolve(root, 'miniprogram/src/games/math/WordProblem/wordProblemLogic.ts');
  const content = readFileSync(file, 'utf-8');
  const texts = [...content.matchAll(/stem\s*:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => unescapeJs(m[1]));
  return { texts, note: '' };
}

// ---------------------------------------------------------------------------
// 语料 5：几何题干（geometryLogic.ts，正则提取 name 后按模板组合 + 固定串）
// ---------------------------------------------------------------------------
/** 从 marker 开始截取到最近的 `];`，提取其中全部 name: '...' */
function extractNames(content, marker) {
  const start = content.indexOf(marker);
  if (start < 0) throw new Error(`geometryLogic.ts 中未找到 ${marker}`);
  const end = content.indexOf('];', start);
  const block = content.slice(start, end);
  return [...block.matchAll(/name\s*:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => unescapeJs(m[1]));
}

function collectGeometry() {
  const file = resolve(root, 'miniprogram/src/games/geometry/geometryLogic.ts');
  const content = readFileSync(file, 'utf-8');

  const flatNames = extractNames(content, 'export const FLAT_SHAPES');
  const solidNames = extractNames(content, 'export const SOLID_SHAPES');
  const lengthNames = extractNames(content, 'const LENGTH_OBJECTS');
  const allShapes = [...flatNames, ...solidNames];

  const texts = [];
  for (const n of solidNames) texts.push(`${n}能滚动吗？`);
  for (const n of allShapes) {
    texts.push(`${n}是平面图形还是立体图形？`);
    texts.push(`${n}是对称的吗？`);
  }
  for (const n of lengthNames) texts.push(`${n}的长度用 厘米 还是 米？`);
  texts.push(
    '这是什么图形？',
    '这是什么角？',
    '从上面看，一共占了几个格子？',
    '从正面看，最高的地方有几层？',
    '这是哪种运动？',
    '1 米 = ? 厘米',
  );
  return {
    texts,
    note: `立体 ${solidNames.length} + 全图形 ${allShapes.length}×2 + 长度物 ${lengthNames.length} + 固定 6`,
  };
}

// ---------------------------------------------------------------------------
// 语料 6：固定引导语（games/**/*.tsx 中 speakZh/speak 的中文串字面量实参）
// 含 ${ 的模板串调用点只统计进 dry-run 报告（运行时动态文本，由云函数兜底覆盖）
// ---------------------------------------------------------------------------
const dynamicSpeakSites = []; // { file, snippet }

/** 递归收集目录下全部 .tsx 文件 */
function walkTsx(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(p));
    else if (entry.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function collectGuidance() {
  const gamesDir = resolve(root, 'miniprogram/src/games');
  const literalRe = /(?:speakZh|speak)\(\s*'((?:[^'\\]|\\.)*)'/g;
  const templateRe = /(?:speakZh|speak)\(\s*`((?:[^`\\]|\\.)*)`/g;
  const texts = [];

  for (const file of walkTsx(gamesDir)) {
    const content = readFileSync(file, 'utf-8');
    let m;
    while ((m = literalRe.exec(content)) !== null) {
      const value = unescapeJs(m[1]);
      if (hasChinese(value)) texts.push(value);
    }
    while ((m = templateRe.exec(content)) !== null) {
      if (m[1].includes('${')) {
        dynamicSpeakSites.push({
          file: relative(root, file).replace(/\\/g, '/'),
          snippet: `\`${m[1]}\``,
        });
      }
    }
  }
  return { texts, note: '' };
}

// ---------------------------------------------------------------------------
// 语料 7：math-content.json 中所有含中文的字符串值
// ---------------------------------------------------------------------------
function collectMathContent() {
  const file = resolve(root, 'miniprogram/src/data/math-content.json');
  const json = JSON.parse(readFileSync(file, 'utf-8'));
  const texts = [];
  walkJson(json, (_key, value) => {
    if (typeof value === 'string' && hasChinese(value)) texts.push(value);
  });
  return { texts, note: '' };
}

// ---------------------------------------------------------------------------
// 汇总语料：各来源统计 + 按 text 去重
// ---------------------------------------------------------------------------
function buildCorpus() {
  const sources = [
    ['古诗（整首 + 单行）', collectPoems],
    ['汉字 char', collectHanzi],
    ['拼音 char/pinyin', collectPinyin],
    ['应用题 stem', collectWordProblems],
    ['几何题干', collectGeometry],
    ['固定引导语', collectGuidance],
    ['math-content 中文字符串', collectMathContent],
  ];

  const stats = [];
  const seen = new Set();
  const unique = [];
  for (const [name, collect] of sources) {
    const { texts: raw, note } = collect();
    const texts = normalize(raw);
    const chars = texts.reduce((sum, t) => sum + t.length, 0);
    stats.push({ name, note, count: texts.length, chars });
    for (const t of texts) {
      if (!seen.has(t)) {
        seen.add(t);
        unique.push(t);
      }
    }
  }
  return { stats, unique };
}

// ---------------------------------------------------------------------------
// 哈希与路径契约（必须与运行时严格一致）
// hash = sha1_hex("zh-CN|" + key)；key 为 normalizeKey 后的文本
// （对齐 miniprogram/src/platform/ttsText.ts 的 normalizeTextKey + zhAudioFileName）
// 入参均为 buildCorpus 已规范化的文本，此处不再重复规范化。
// ---------------------------------------------------------------------------
function hashText(text) {
  return createHash('sha1').update(`zh-CN|${text}`, 'utf8').digest('hex');
}

function audioRelPath(text) {
  return `/audio/zh/${hashText(text)}.mp3`;
}

// ---------------------------------------------------------------------------
// 腾讯云 TTS 客户端（API 3.0，TC3-HMAC-SHA256 签名，node:crypto + fetch，无依赖）
// 文档：https://cloud.tencent.com/document/product/1073/37995
// ---------------------------------------------------------------------------
const TTS_HOST = 'tts.tencentcloudapi.com';
const TTS_SERVICE = 'tts';
const TTS_ACTION = 'TextToVoice';
const TTS_VERSION = '2019-08-23';
const TTS_REGION = 'ap-guangzhou';
const MAX_TEXT_LEN = 140; // 接口文本长度上限守卫（当前语料最长约 60 字，不应触发）

function sha256Hex(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacRaw(key, data) {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function hmacHex(key, data) {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/**
 * 调腾讯云 TextToVoice 合成语音，返回 MP3 Buffer。
 * @param {string} text 要合成的中文文本
 * @returns {Promise<Buffer>} MP3 音频数据
 */
async function synthesize(text) {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10); // UTC 日期

  // 请求体：Text 须 base64(UTF-8) 编码
  const params = {
    Text: Buffer.from(text, 'utf8').toString('base64'),
    SessionId: randomUUID(),
    VoiceType: Number(process.env.TTS_VOICE || 101016), // 默认 101016 智甜·女童声
    Codec: 'mp3',
    SampleRate: 16000,
    ModelType: 1,
  };
  if (process.env.TTS_SPEED) params.Speed = Number(process.env.TTS_SPEED);
  const payload = JSON.stringify(params);

  // 第 1 步：拼接规范请求串（CanonicalRequest）
  const contentType = 'application/json; charset=utf-8';
  const canonicalHeaders =
    `content-type:${contentType}\n` + `host:${TTS_HOST}\n` + `x-tc-action:${TTS_ACTION.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, sha256Hex(payload)].join('\n');

  // 第 2 步：拼接待签名字符串（StringToSign）
  const credentialScope = `${date}/${TTS_SERVICE}/tc3_request`;
  const stringToSign = ['TC3-HMAC-SHA256', timestamp, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  // 第 3 步：三级 HMAC 派生签名密钥并计算签名
  const secretDate = hmacRaw(`TC3${secretKey}`, date);
  const secretService = hmacRaw(secretDate, TTS_SERVICE);
  const secretSigning = hmacRaw(secretService, 'tc3_request');
  const signature = hmacHex(secretSigning, stringToSign);

  // 第 4 步：拼接 Authorization 头并发起请求
  const authorization =
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(`https://${TTS_HOST}`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': contentType,
      'Host': TTS_HOST,
      'X-TC-Action': TTS_ACTION,
      'X-TC-Version': TTS_VERSION,
      'X-TC-Region': TTS_REGION,
      'X-TC-Timestamp': String(timestamp),
    },
    body: payload,
  });

  const json = await resp.json().catch(() => null);
  if (!json || !json.Response) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const { Audio, Error: apiError } = json.Response;
  if (apiError) {
    throw new Error(`腾讯云 TTS 错误 ${apiError.Code}: ${apiError.Message}`);
  }
  if (!Audio) {
    throw new Error('响应缺少 Audio 字段');
  }
  return Buffer.from(Audio, 'base64');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const { stats, unique } = buildCorpus();

  let texts = unique;
  if (opts.limit > 0) {
    texts = texts.slice(0, opts.limit);
  }

  const audioDir = resolve(root, 'public/audio/zh');
  if (!opts.dryRun) {
    mkdirSync(audioDir, { recursive: true });
  }

  console.log(`=== 小程序中文朗读音频生成工具（腾讯云 TTS） ===`);
  console.log(`模式: ${opts.dryRun ? 'dry-run（不检查密钥、不发请求、不写文件）' : opts.force ? '强制覆盖' : '增量生成'}`);
  console.log(`音色: ${process.env.TTS_VOICE || 101016}（智甜·女童声）${process.env.TTS_SPEED ? `，语速: ${process.env.TTS_SPEED}` : ''}`);
  console.log('');

  // --- 语料统计（dry-run 的核心输出） ---
  console.log('--- 语料统计 ---');
  let totalCount = 0;
  let totalChars = 0;
  for (const s of stats) {
    console.log(`[${s.name}] ${s.count} 条，${s.chars} 字符${s.note ? `（${s.note}）` : ''}`);
    totalCount += s.count;
    totalChars += s.chars;
  }
  const uniqueChars = unique.reduce((sum, t) => sum + t.length, 0);
  console.log(`合计 ${totalCount} 条，${totalChars} 字符`);
  console.log(`去重后 ${unique.length} 条，${uniqueChars} 字符（去除 ${totalCount - unique.length} 条重复）`);
  if (opts.limit > 0) console.log(`--limit ${opts.limit}：本次仅处理前 ${texts.length} 条`);

  // --- 汉字 JSON 中其他可能朗读的字段（仅报告，不计入主语料） ---
  if (Object.keys(hanziExtra).length > 0) {
    console.log('\n--- 汉字 JSON 其他可能朗读字段（仅报告，未计入主语料） ---');
    for (const [key, values] of Object.entries(hanziExtra)) {
      const samples = [...values].slice(0, 5).join('、');
      console.log(`  ${key}: ${values.size} 个不同值（示例：${samples}）`);
    }
  }

  // --- 运行时动态文本（由云函数兜底覆盖） ---
  console.log('\n--- 运行时动态文本（由云函数兜底覆盖） ---');
  console.log(`含 \${} 的模板串调用点共 ${dynamicSpeakSites.length} 处：`);
  for (const site of dynamicSpeakSites) {
    console.log(`  ${site.file}: ${site.snippet}`);
  }

  if (opts.dryRun) {
    return;
  }

  // --- 检查密钥（dry-run 不检查） ---
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    console.error('\n错误：缺少环境变量 TENCENT_SECRET_ID / TENCENT_SECRET_KEY。');
    console.error('请先设置腾讯云 API 密钥后再运行（--dry-run 模式不需要密钥）：');
    console.error('  export TENCENT_SECRET_ID=AKID...');
    console.error('  export TENCENT_SECRET_KEY=...');
    process.exit(1);
  }

  // --- 并发生成 ---
  const results = { success: [], skipped: [], failed: [], warnings: [] };
  const concurrency = 3; // 并发数，避免被限流

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(texts.length / concurrency);
    console.log(`\n--- 批次 ${batchNum}/${totalBatches} ---`);

    await Promise.all(
      batch.map(async (text) => {
        const fullPath = join(audioDir, `${hashText(text)}.mp3`);

        // 长度守卫：超过接口上限的文本跳过并记入警告
        if (text.length > MAX_TEXT_LEN) {
          results.warnings.push(text);
          console.log(`  [警告] 文本超长（${text.length} 字 > ${MAX_TEXT_LEN}），跳过: ${text.slice(0, 30)}…`);
          return;
        }

        if (!opts.force && existsSync(fullPath)) {
          results.skipped.push(text);
          console.log(`  [跳过] ${text} (已存在)`);
          return;
        }

        try {
          const mp3Buffer = await synthesize(text);
          writeFileSync(fullPath, mp3Buffer);
          results.success.push(text);
          console.log(`  ✅ ${text}`);
        } catch (err) {
          results.failed.push({ text, error: err.message });
          console.log(`  ❌ ${text}: ${err.message}`);
        }
      }),
    );

    // 批次间延迟
    if (i + concurrency < texts.length) {
      await sleep(500);
    }
  }

  // --- 生成映射文件（增量：保留已有映射中文件仍存在的条目） ---
  generateMapping(unique, audioDir);

  // --- 输出总结 ---
  console.log('\n=== 生成总结 ===');
  console.log(`成功: ${results.success.length}`);
  console.log(`跳过: ${results.skipped.length}`);
  console.log(`失败: ${results.failed.length}`);
  console.log(`警告: ${results.warnings.length}`);
  if (results.failed.length > 0) {
    console.log('\n失败列表:');
    for (const f of results.failed) {
      console.log(`  - ${f.text}: ${f.error}`);
    }
    console.log('\n可重新运行脚本（增量模式会自动重试失败的）');
  }
  if (results.warnings.length > 0) {
    console.log('\n警告列表（超长跳过）:');
    for (const w of results.warnings) {
      console.log(`  - ${w}`);
    }
  }
}

/**
 * 生成 zh-audios.json 映射文件：{ "<text>": "/audio/zh/<hash>.mp3" }
 * 只包含实际存在的音频文件；增量保留已有映射中文件仍存在的条目。
 */
function generateMapping(corpus, audioDir) {
  const mappingPath = resolve(root, 'miniprogram/src/data/zh-audios.json');

  // 读取已有映射（可能不存在，或是 {} 占位）
  let existing = {};
  if (existsSync(mappingPath)) {
    try {
      existing = JSON.parse(readFileSync(mappingPath, 'utf-8'));
    } catch {
      console.log(`\n已有映射文件解析失败，将从空映射重建: ${mappingPath}`);
    }
  }

  // 保留已有映射中文件仍存在的条目
  const mapping = {};
  for (const [text, rel] of Object.entries(existing)) {
    const fileName = typeof rel === 'string' ? rel.split('/').pop() : '';
    if (fileName && existsSync(join(audioDir, fileName))) {
      mapping[text] = rel;
    }
  }

  // 加入本次语料中文件已生成的条目
  for (const text of corpus) {
    const fullPath = join(audioDir, `${hashText(text)}.mp3`);
    if (existsSync(fullPath)) {
      mapping[text] = audioRelPath(text);
    }
  }

  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');
  console.log(`\n映射文件已更新: miniprogram/src/data/zh-audios.json (${Object.keys(mapping).length} 条)`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
