/**
 * genWordImages.mjs —— 批量生成英语单词配图。
 *
 * 用法：
 *   node scripts/genWordImages.mjs                 # 生成全部缺失图片（增量）
 *   node scripts/genWordImages.mjs --category 动物  # 仅生成指定分类
 *   node scripts/genWordImages.mjs --limit 5        # 限制数量（测试用）
 *   node scripts/genWordImages.mjs --force          # 强制重新生成已存在的图片
 *   node scripts/genWordImages.mjs --dry-run        # 只输出 prompt 不实际生成
 *
 * 产出：
 *   public/images/words/{word}.png    —— 每个单词一张配图（正方形）
 *   src/data/word-images.json         —— word → 图片路径映射表
 *
 * 图片来源：TRAE 内置 text_to_image API（SDXL）。
 * 增量生成：默认跳过已存在的图片，可用 --force 覆盖。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 解析命令行参数
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opts = {
  category: getArg(args, '--category'),
  limit: getArg(args, '--limit') ? parseInt(getArg(args, '--limit'), 10) : 0,
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
};

function getArg(arr, flag) {
  const i = arr.indexOf(flag);
  return i >= 0 && i + 1 < arr.length ? arr[i + 1] : null;
}

// ---------------------------------------------------------------------------
// 从 vocabData.ts 提取单词数据
// ---------------------------------------------------------------------------
function loadVocab() {
  const vocabPath = resolve(root, 'src/data/vocabData.ts');
  const content = readFileSync(vocabPath, 'utf-8');

  // 只在 VOCAB 数组定义范围内提取（排除 VOCAB_BY_THEME 中的重复引用）
  const vocabStart = content.indexOf('export const VOCAB');
  const vocabEnd = content.indexOf('export const VOCAB_BY_THEME');
  const vocabBlock = content.slice(vocabStart, vocabEnd);

  const vocab = [];
  const lineRe = /\{\s*en:\s*"([^"]+)",\s*zh:\s*"([^"]+)",\s*pos:\s*"([^"]+)"(?:,\s*example:\s*"([^"]*)")?,\s*theme:\s*"([^"]+)"/g;
  let m;
  while ((m = lineRe.exec(vocabBlock)) !== null) {
    vocab.push({
      en: m[1],
      zh: m[2],
      pos: m[3],
      example: m[4] || '',
      theme: m[5],
    });
  }

  // 去重（按 en 单词主键）
  const seen = new Set();
  const unique = vocab.filter((v) => {
    if (seen.has(v.en)) return false;
    seen.add(v.en);
    return true;
  });

  // 提取 THEME_EMOJI
  const themeEmoji = {};
  const themeRe = /"([^"]+)":\s*"([^"]+)"/g;
  const themeBlock = content.slice(content.indexOf('THEME_EMOJI'));
  while ((m = themeRe.exec(themeBlock)) !== null) {
    themeEmoji[m[1]] = m[2];
  }

  return { vocab: unique, themeEmoji };
}

// ---------------------------------------------------------------------------
// 构造 SDXL prompt
// ---------------------------------------------------------------------------
function buildPrompt(word) {
  // 根据主题调整描述风格
  const themeDesc = {
    '数字': 'number concept',
    '颜色': 'color swatch',
    '家庭成员': 'family member',
    '动物': 'cute animal',
    '食物与饮品': 'food and drink',
    '身体部位': 'body part',
    '学校用品': 'school supply',
    '自然与天气': 'nature and weather',
    '方位': 'direction concept',
    '时间': 'time concept',
    '课堂用语': 'classroom activity',
    '节日': 'festival celebration',
    '衣着': 'clothing item',
    '运动': 'sports activity',
    '常见动词': 'action verb illustration',
    '常见形容词': 'adjective concept',
    '常见名词': 'everyday object',
  };
  const desc = themeDesc[word.theme] || 'object';
  // prompt 要求：儿童绘本风格、简单清晰、白色背景
  return `a cute children's book illustration of ${word.zh} (${word.en}), ${desc}, simple colorful flat design, white background, educational card style`;
}

// ---------------------------------------------------------------------------
// 调用 TRAE 图片生成 API
// ---------------------------------------------------------------------------
const TRAE_API = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';

async function generateImage(prompt) {
  const url = `${TRAE_API}?prompt=${encodeURIComponent(prompt)}&image_size=square`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  const contentType = resp.headers.get('content-type') || '';

  // 情况1：API 直接返回图片字节流
  if (contentType.startsWith('image/')) {
    const buffer = Buffer.from(await resp.arrayBuffer());
    return buffer;
  }

  // 情况2：API 返回 JSON（含图片 URL 或 base64）
  const data = await resp.json();
  const imageUrl = data.url || data.data?.url || data.image_url || data.data?.image_url;
  if (imageUrl) {
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`下载图片失败: HTTP ${imgResp.status}`);
    }
    return Buffer.from(await imgResp.arrayBuffer());
  }

  // 情况3：API 返回 base64 编码的图片
  const b64 = data.b64_json || data.data?.b64_json || data.image || data.data?.image;
  if (b64) {
    return Buffer.from(b64, 'base64');
  }

  throw new Error('响应中未找到图片数据');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const { vocab, themeEmoji } = loadVocab();

  // 按分类过滤
  let words = vocab;
  if (opts.category) {
    words = vocab.filter((w) => w.theme === opts.category);
    if (words.length === 0) {
      console.error(`未找到分类「${opts.category}」。可用分类：`);
      console.error([...new Set(vocab.map((v) => v.theme))].join('、'));
      process.exit(1);
    }
  }

  // 限制数量
  if (opts.limit > 0) {
    words = words.slice(0, opts.limit);
  }

  // 确保输出目录存在
  const imagesDir = resolve(root, 'public/images/words');
  if (!opts.dryRun) {
    mkdirSync(imagesDir, { recursive: true });
  }

  console.log(`=== 英语单词配图生成工具 ===`);
  console.log(`总单词数: ${words.length}`);
  console.log(`分类: ${opts.category || '全部'}`);
  console.log(`模式: ${opts.dryRun ? 'dry-run（仅输出 prompt）' : opts.force ? '强制覆盖' : '增量生成'}`);
  console.log('');

  const results = { success: [], skipped: [], failed: [] };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const imgPath = `${word.en}.png`;
    const fullPath = join(imagesDir, imgPath);

    // 增量跳过
    if (!opts.force && !opts.dryRun && existsSync(fullPath)) {
      results.skipped.push(word.en);
      continue;
    }

    const prompt = buildPrompt(word);
    console.log(`[${i + 1}/${words.length}] ${word.en} (${word.zh}) [${word.theme}]`);

    if (opts.dryRun) {
      console.log(`  prompt: ${prompt}`);
      results.success.push(word.en);
      continue;
    }

    try {
      const buffer = await generateImage(prompt);
      writeFileSync(fullPath, buffer);
      results.success.push(word.en);
      console.log(`  ✅ 已生成: public/images/words/${imgPath}`);
      // 礼貌延迟，避免请求过快
      await sleep(500);
    } catch (err) {
      results.failed.push({ word: word.en, error: err.message });
      console.log(`  ❌ 失败: ${err.message}`);
      // 失败后也延迟一下
      await sleep(1000);
    }
  }

  // 生成映射文件（非 dry-run 模式）
  if (!opts.dryRun) {
    await generateMapping(vocab, imagesDir);
  }

  // 输出总结
  console.log('\n=== 生成总结 ===');
  console.log(`成功: ${results.success.length}`);
  console.log(`跳过: ${results.skipped.length}`);
  console.log(`失败: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('\n失败列表:');
    for (const f of results.failed) {
      console.log(`  - ${f.word}: ${f.error}`);
    }
  }
}

/**
 * 生成 word-images.json 映射文件（包含所有已存在图片的单词）。
 */
async function generateMapping(vocab, imagesDir) {
  const mapping = {};
  for (const word of vocab) {
    const imgPath = join(imagesDir, `${word.en}.png`);
    if (existsSync(imgPath)) {
      mapping[word.en] = `/images/words/${word.en}.png`;
    }
  }
  const mappingPath = resolve(root, 'src/data/word-images.json');
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');
  console.log(`\n映射文件已更新: src/data/word-images.json (${Object.keys(mapping).length} 词)`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
