/**
 * genWordAudios.mjs —— 批量生成英语单词朗读音频（Edge TTS）。
 *
 * 用法：
 *   node scripts/genWordAudios.mjs                 # 生成全部缺失音频（增量）
 *   node scripts/genWordAudios.mjs --category 动物  # 仅生成指定分类
 *   node scripts/genWordAudios.mjs --limit 5        # 限制数量（测试用）
 *   node scripts/genWordAudios.mjs --force          # 强制重新生成已存在的音频
 *   node scripts/genWordAudios.mjs --dry-run        # 只输出 SSML 不实际生成
 *
 * 产出：
 *   public/audio/words/{word}.mp3    —— 每个单词一个朗读音频
 *   src/data/word-audios.json        —— word → 音频路径映射表
 *
 * 音频来源：有道词典 TTS（免费、无需 API Key、国内直连、支持中英文）
 * - 英文：type=1 美式发音
 * - 中文：type=2 默认音色
 *
 * 增量生成：默认跳过已存在的音频，可用 --force 覆盖。
 * 协议：HTTP GET 直连有道词典 TTS，无第三方依赖。
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

  const vocabStart = content.indexOf('export const VOCAB');
  const vocabEnd = content.indexOf('export const VOCAB_BY_THEME');
  const vocabBlock = content.slice(vocabStart, vocabEnd);

  const vocab = [];
  const lineRe =
    /\{\s*en:\s*"([^"]+)",\s*zh:\s*"([^"]+)",\s*pos:\s*"([^"]+)"(?:,\s*example:\s*"([^"]*)")?,\s*theme:\s*"([^"]+)"/g;
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
  return vocab.filter((v) => {
    if (seen.has(v.en)) return false;
    seen.add(v.en);
    return true;
  });
}

// ---------------------------------------------------------------------------
// TTS 客户端（有道词典 TTS，HTTP GET，国内可访问，无需依赖）
// ---------------------------------------------------------------------------
// 有道词典 TTS：免费、支持中英文、返回 MP3 音频字节流
// URL 格式：https://dict.youdao.com/dictvoice?audio={text}&type={type}
//   type=1 → 美式发音（适合英语单词学习）
//   type=2 → 英式发音
//   type=3 → 男声（部分文本可用）
//
// 优势：国内直连速度快、专为单词/短语发音优化、无需 API Key
// 限制：单次请求文本不宜过长（单词/短句最佳）

const TTS_URL = 'https://dict.youdao.com/dictvoice';

/**
 * 通过有道词典 TTS 合成语音，返回 MP3 Buffer。
 * @param {string} text 要合成的文本
 * @param {string} lang 语言代码 'en-US' 或 'zh-CN'
 * @returns {Promise<Buffer>} MP3 音频数据
 */
async function synthesize(text, lang = 'en-US') {
  // type=1 美式英语；中文文本也走有道默认音色
  const type = lang.toLowerCase().startsWith('en') ? 1 : 2;
  const url = `${TTS_URL}?audio=${encodeURIComponent(text)}&type=${type}`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://dict.youdao.com/',
    },
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  // 有道错误时可能返回非音频内容（很短的 HTML 或空）
  if (buffer.length < 100) {
    throw new Error(`响应过短 (${buffer.length} bytes)，可能非音频`);
  }

  return buffer;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const vocab = loadVocab();

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

  const audioDir = resolve(root, 'public/audio/words');
  if (!opts.dryRun) {
    mkdirSync(audioDir, { recursive: true });
  }

  console.log(`=== 英语单词音频生成工具（有道词典 TTS） ===`);
  console.log(`总单词数: ${words.length}`);
  console.log(`分类: ${opts.category || '全部'}`);
  console.log(`模式: ${opts.dryRun ? 'dry-run' : opts.force ? '强制覆盖' : '增量生成'}`);
  console.log(`音色: 美式发音 (type=1)`);
  console.log('');

  const results = { success: [], skipped: [], failed: [] };
  const concurrency = 3; // 并发数，避免被限流

  for (let i = 0; i < words.length; i += concurrency) {
    const batch = words.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(words.length / concurrency);
    console.log(`\n--- 批次 ${batchNum}/${totalBatches} ---`);

    await Promise.all(
      batch.map(async (word) => {
        const audioPath = `${word.en}.mp3`;
        const fullPath = join(audioDir, audioPath);

        if (!opts.force && !opts.dryRun && existsSync(fullPath)) {
          results.skipped.push(word.en);
          console.log(`  [跳过] ${word.en} (已存在)`);
          return;
        }

        if (opts.dryRun) {
          console.log(`  [dry-run] ${word.en}: speak("${word.en}", en-US)`);
          results.success.push(word.en);
          return;
        }

        try {
          const mp3Buffer = await synthesize(word.en, 'en-US');
          writeFileSync(fullPath, mp3Buffer);
          results.success.push(word.en);
          console.log(`  ✅ ${word.en} (${word.zh})`);
        } catch (err) {
          results.failed.push({ word: word.en, error: err.message });
          console.log(`  ❌ ${word.en}: ${err.message}`);
        }
      }),
    );

    // 批次间延迟
    if (i + concurrency < words.length) {
      await sleep(500);
    }
  }

  // 生成映射文件
  if (!opts.dryRun) {
    generateMapping(vocab, audioDir);
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
    console.log('\n可重新运行脚本（增量模式会自动重试失败的）');
  }
}

/**
 * 生成 word-audios.json 映射文件。
 */
function generateMapping(vocab, audioDir) {
  const mapping = {};
  for (const word of vocab) {
    const audioPath = join(audioDir, `${word.en}.mp3`);
    if (existsSync(audioPath)) {
      mapping[word.en] = `/audio/words/${word.en}.mp3`;
    }
  }
  const mappingPath = resolve(root, 'src/data/word-audios.json');
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');
  console.log(`\n映射文件已更新: src/data/word-audios.json (${Object.keys(mapping).length} 词)`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
