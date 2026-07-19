/**
 * genWordImages.mjs —— 批量生成英语单词配图。
 *
 * 用法：
 *   node scripts/genWordImages.mjs                 # 生成全部缺失图片（增量）
 *   node scripts/genWordImages.mjs --category 动物  # 仅生成指定分类
 *   node scripts/genWordImages.mjs --limit 5        # 限制数量（测试用）
 *   node scripts/genWordImages.mjs --force          # 强制重新生成已存在的图片
 *   node scripts/genWordImages.mjs --dry-run        # 只输出 prompt 不实际生成
 *   node scripts/genWordImages.mjs --retries 3      # 失败重试次数（默认3）
 *
 * 产出：
 *   public/images/words/{word}.png    —— 每个单词一张配图（正方形）
 *   src/data/word-images.json         —— word → 图片路径映射表
 *
 * 图片来源：TRAE 内置 text_to_image API（SDXL）。
 * 特性：
 *   - 自动检测占位图（"The image is generating..."）并重试
 *   - 自动识别 JPEG/PNG 格式
 *   - 增量生成，支持 --force 覆盖
 *   - 文件大小校验，拒绝过小的无效图片
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 占位图特征（已知的 "image is generating" 占位图大小）
// ---------------------------------------------------------------------------
const PLACEHOLDER_SIZES = new Set([176626]);
const MIN_VALID_SIZE = 50000;

// ---------------------------------------------------------------------------
// 解析命令行参数
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opts = {
  category: getArg(args, '--category'),
  limit: getArg(args, '--limit') ? parseInt(getArg(args, '--limit'), 10) : 0,
  retries: getArg(args, '--retries') ? parseInt(getArg(args, '--retries'), 10) : 3,
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

  const seen = new Set();
  const unique = vocab.filter((v) => {
    if (seen.has(v.en)) return false;
    seen.add(v.en);
    return true;
  });

  return { vocab: unique };
}

// ---------------------------------------------------------------------------
// 构造 SDXL prompt
// ---------------------------------------------------------------------------
function buildPrompt(word) {
  const themeDesc = {
    '数字': 'bright colorful number digit',
    '颜色': 'vibrant color swatch sample',
    '家庭成员': 'warm family member portrait',
    '动物': 'cute adorable animal character',
    '食物与饮品': 'delicious appetizing food and drink',
    '身体部位': 'cartoon character body part',
    '学校用品': 'colorful school stationery supply',
    '自然与天气': 'beautiful nature weather landscape',
    '方位': 'spatial direction concept illustration',
    '时间': 'clock calendar time concept',
    '课堂用语': 'cheerful classroom school activity',
    '节日': 'festive holiday celebration decoration',
    '衣着': 'colorful clothing fashion item',
    '运动': 'sports equipment athletic activity',
    '常见动词': 'cartoon character performing action verb',
    '常见形容词': 'adjective concept descriptive illustration',
    '常见名词': 'everyday household object item',
  };
  const desc = themeDesc[word.theme] || 'everyday object';
  return `children's book illustration style, cute kawaii ${desc}, single centered object: ${word.zh} (${word.en}), simple flat design, pure white background, no text, no letters, no words, educational flashcard, soft pastel colors, high quality, 4k`;
}

// ---------------------------------------------------------------------------
// 图片校验
// ---------------------------------------------------------------------------
function isValidImage(buffer) {
  if (!buffer || buffer.length < MIN_VALID_SIZE) {
    return { valid: false, reason: `文件过小 (${buffer?.length || 0} bytes)` };
  }

  if (PLACEHOLDER_SIZES.has(buffer.length)) {
    return { valid: false, reason: '疑似占位图（大小匹配已知占位图）' };
  }

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

  if (!isJpeg && !isPng) {
    return { valid: false, reason: `未知文件格式 (magic: ${buffer.slice(0, 4).toString('hex')})` };
  }

  return { valid: true, format: isPng ? 'png' : 'jpeg' };
}

// ---------------------------------------------------------------------------
// 调用 TRAE 图片生成 API（带重试）
// ---------------------------------------------------------------------------
const TRAE_API = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';

async function generateImage(prompt, retries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${TRAE_API}?prompt=${encodeURIComponent(prompt)}&image_size=square_hd`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const contentType = resp.headers.get('content-type') || '';
      let buffer;

      if (contentType.startsWith('image/')) {
        buffer = Buffer.from(await resp.arrayBuffer());
      } else {
        const data = await resp.json();
        const imageUrl = data.url || data.data?.url || data.image_url || data.data?.image_url;
        if (imageUrl) {
          const imgResp = await fetch(imageUrl);
          if (!imgResp.ok) {
            throw new Error(`下载图片失败: HTTP ${imgResp.status}`);
          }
          buffer = Buffer.from(await imgResp.arrayBuffer());
        } else {
          const b64 = data.b64_json || data.data?.b64_json || data.image || data.data?.image;
          if (b64) {
            buffer = Buffer.from(b64, 'base64');
          } else {
            throw new Error('响应中未找到图片数据');
          }
        }
      }

      const validation = isValidImage(buffer);
      if (validation.valid) {
        return { buffer, format: validation.format };
      }

      lastError = new Error(validation.reason);
      console.log(`    重试 ${attempt}/${retries}: ${validation.reason}`);

      if (attempt < retries) {
        await sleep(2000 * attempt);
      }
    } catch (err) {
      lastError = err;
      console.log(`    重试 ${attempt}/${retries}: ${err.message}`);
      if (attempt < retries) {
        await sleep(2000 * attempt);
      }
    }
  }

  throw lastError || new Error('生成失败');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const { vocab } = loadVocab();

  let words = vocab;
  if (opts.category) {
    words = vocab.filter((w) => w.theme === opts.category);
    if (words.length === 0) {
      console.error(`未找到分类「${opts.category}」。可用分类：`);
      console.error([...new Set(vocab.map((v) => v.theme))].join('、'));
      process.exit(1);
    }
  }

  if (opts.limit > 0) {
    words = words.slice(0, opts.limit);
  }

  const imagesDir = resolve(root, 'public/images/words');
  if (!opts.dryRun) {
    mkdirSync(imagesDir, { recursive: true });
  }

  console.log(`=== 英语单词配图生成工具 ===`);
  console.log(`总单词数: ${words.length}`);
  console.log(`分类: ${opts.category || '全部'}`);
  console.log(`重试次数: ${opts.retries}`);
  console.log(`模式: ${opts.dryRun ? 'dry-run（仅输出 prompt）' : opts.force ? '强制覆盖' : '增量生成'}`);
  console.log('');

  const results = { success: [], skipped: [], failed: [] };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const imgPath = `${word.en}.png`;
    const fullPath = join(imagesDir, imgPath);

    if (!opts.force && !opts.dryRun && existsSync(fullPath)) {
      const existingStat = statSync(fullPath);
      const existingCheck = isValidImage(readFileSync(fullPath));
      if (existingCheck.valid) {
        results.skipped.push(word.en);
        continue;
      }
      console.log(`[${i + 1}/${words.length}] ${word.en} (${word.zh}) [${word.theme}] - 现有文件无效，重新生成`);
    } else {
      console.log(`[${i + 1}/${words.length}] ${word.en} (${word.zh}) [${word.theme}]`);
    }

    const prompt = buildPrompt(word);

    if (opts.dryRun) {
      console.log(`  prompt: ${prompt}`);
      results.success.push(word.en);
      continue;
    }

    try {
      const { buffer, format } = await generateImage(prompt, opts.retries);
      writeFileSync(fullPath, buffer);
      results.success.push(word.en);
      console.log(`  ✅ 已生成: public/images/words/${imgPath} (${format}, ${(buffer.length / 1024).toFixed(1)}KB)`);
      await sleep(800);
    } catch (err) {
      results.failed.push({ word: word.en, error: err.message });
      console.log(`  ❌ 失败: ${err.message}`);
      await sleep(1500);
    }
  }

  if (!opts.dryRun) {
    await generateMapping(vocab, imagesDir);
  }

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

async function generateMapping(vocab, imagesDir) {
  const mapping = {};
  for (const word of vocab) {
    const imgPath = join(imagesDir, `${word.en}.png`);
    if (existsSync(imgPath)) {
      const check = isValidImage(readFileSync(imgPath));
      if (check.valid) {
        mapping[word.en] = `/images/words/${word.en}.png`;
      }
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
