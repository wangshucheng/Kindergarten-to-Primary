import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');
const gamesDir = join(__dirname, '..', 'src', 'games');

const issues = [];
const stats = { total: 0, passed: 0, issues: 0, skipped: 0 };

function check(condition, file, field, value, emoji, expected, note) {
  stats.total++;
  if (!condition) {
    stats.issues++;
    issues.push({ file, field, value, emoji, expected, note });
  } else {
    stats.passed++;
  }
}

function isEmoji(ch) {
  const cp = ch.codePointAt(0);
  return (
    (cp >= 0x1F300 && cp <= 0x1F9FF) ||
    (cp >= 0x2600 && cp <= 0x27BF) ||
    (cp >= 0x1F600 && cp <= 0x1F64F) ||
    (cp >= 0x1F680 && cp <= 0x1F6FF) ||
    (cp >= 0x1F900 && cp <= 0x1F9FF) ||
    (cp >= 0x2700 && cp <= 0x27BF) ||
    (cp >= 0x1F1E0 && cp <= 0x1F1FF) ||
    (cp >= 0xFE00 && cp <= 0xFE0F) ||
    cp === 0x200D ||
    (cp >= 0x1FA70 && cp <= 0x1FAFF) ||
    (cp >= 0x1F000 && cp <= 0x1F0FF) ||
    (cp >= 0x2B00 && cp <= 0x2BFF)
  );
}

function normalizeEmoji(str) {
  if (!str) return '';
  return [...str].filter(ch => {
    const cp = ch.codePointAt(0);
    return !(cp >= 0xFE00 && cp <= 0xFE0F) && cp !== 0x200D;
  }).join('');
}

function getFirstEmoji(str) {
  if (!str) return null;
  for (const ch of str) {
    if (isEmoji(ch)) return ch;
  }
  return null;
}

function hasEmoji(str) {
  return getFirstEmoji(str) !== null;
}

// Comprehensive known emoji mappings
const englishEmojiMap = {
  'cat': ['🐱'], 'dog': ['🐶'], 'bird': ['🐦'], 'fish': ['🐟'], 'rabbit': ['🐰'],
  'tiger': ['🐯'], 'lion': ['🦁'], 'monkey': ['🐵'], 'cow': ['🐮'], 'pig': ['🐷'],
  'horse': ['🐴'], 'sheep': ['🐑'], 'chicken': ['🐔'], 'duck': ['🦆'], 'mouse': ['🐭'],
  'panda': ['🐼'], 'bear': ['🐻'], 'elephant': ['🐘'], 'frog': ['🐸'], 'bee': ['🐝'],
  'butterfly': ['🦋'], 'snake': ['🐍'], 'goose': ['🪿', '🦢'], 'goat': ['🐐'],
  'ant': ['🐜'], 'spider': ['🕷️'], 'frog': ['🐸'], 'chicken': ['🐔'],
  'sun': ['☀️'], 'moon': ['🌙'], 'star': ['⭐'], 'cloud': ['☁️'], 'rain': ['🌧️'],
  'snow': ['❄️'], 'tree': ['🌳'], 'flower': ['🌸'], 'mountain': ['⛰️'], 'water': ['💧'],
  'fire': ['🔥'], 'wind': ['💨', '🌬️'], 'river': ['🌊'], 'sea': ['🌊'], 'forest': ['🌲'],
  'leaf': ['🍃'], 'grass': ['🌿'], 'island': ['🏝️'], 'sky': ['☁️', '🌤️'],
  'apple': ['🍎'], 'banana': ['🍌'], 'orange': ['🍊'], 'grape': ['🍇'],
  'watermelon': ['🍉'], 'peach': ['🍑'], 'rice': ['🍚'], 'bread': ['🍞'],
  'egg': ['🥚'], 'milk': ['🥛'], 'cake': ['🍰'], 'candy': ['🍬'], 'pear': ['🍐'],
  'meat': ['🍖'], 'soup': ['🍲'], 'tea': ['🍵'], 'juice': ['🧃'], 'cookie': ['🍪'],
  'book': ['📚', '📖'], 'pen': ['🖊️'], 'pencil': ['✏️'], 'paper': ['📄'], 'chair': ['🪑'],
  'table': ['🪑'], 'door': ['🚪'], 'window': ['🪟'], 'house': ['🏠'], 'car': ['🚗'],
  'boat': ['⛵'], 'plane': ['✈️'], 'train': ['🚂'], 'bus': ['🚌'], 'bike': ['🚲'],
  'ball': ['⚽'], 'clock': ['⏰', '🕰️'], 'phone': ['📱'], 'key': ['🔑'], 'umbrella': ['☂️'],
  'flag': ['🚩'], 'ship': ['🚢'], 'bridge': ['🌉'], 'road': ['🛣️'],
  'eye': ['👁️', '👀'], 'ear': ['👂'], 'mouth': ['👄'], 'hand': ['✋'], 'foot': ['🦶'],
  'heart': ['❤️'], 'nose': ['👃'],
  'red': ['🔴'], 'blue': ['🔵'], 'yellow': ['🟡'], 'green': ['🟢'],
  'white': ['⚪'], 'black': ['⚫'], 'pink': ['💗'], 'purple': ['🟣'],
  'brown': ['🟤'], 'gray': ['⬜'], 'orange-color': ['🟠'],
  'mom': ['👩'], 'mother': ['👩'], 'dad': ['👨'], 'father': ['👨'],
  'boy': ['👦'], 'girl': ['👧'], 'baby': ['👶'], 'man': ['👨'], 'woman': ['👩'],
  'grandpa': ['👴'], 'grandma': ['👵'], 'friend': ['👫'], 'child': ['🧒'],
  'teacher': ['👩‍🏫'], 'doctor': ['🩺'], 'nurse': ['🧑‍⚕️'], 'police': ['👮'],
  'sister': ['👧'], 'brother': ['👦'],
  'one': ['1️⃣'], 'two': ['2️⃣'], 'three': ['3️⃣'], 'four': ['4️⃣'], 'five': ['5️⃣'],
  'six': ['6️⃣'], 'seven': ['7️⃣'], 'eight': ['8️⃣'], 'nine': ['9️⃣'], 'ten': ['🔟'],
  'big': ['🐘', '📏'], 'small': ['🐭', '🤏'], 'tall': ['📏'], 'short': ['✂️', '🐢'],
  'fast': ['⚡'], 'slow': ['🐢'], 'happy': ['😊'], 'sad': ['😢'],
  'hot': ['🔥'], 'cold': ['❄️'], 'warm': ['🔥'], 'cool': ['❄️'],
  'run': ['🏃'], 'jump': ['⤴️', '🤸'], 'eat': ['😋'], 'drink': ['🥤'],
  'sleep': ['😴'], 'read': ['📖'], 'write': ['✍️'], 'play': ['🧸'],
  'sing': ['🎤'], 'walk': ['🚶'], 'swim': ['🏊'], 'fly': ['✈️', '🦅'],
  'look': ['👀'], 'listen': ['👂'], 'speak': ['🗣️'], 'help': ['🤝'], 'love': ['❤️'],
  'open': ['🔓'], 'close': ['🔒'], 'come': ['➡️'], 'go': ['⬅️'],
  'sit': ['🪑'], 'stand': ['🧍'],
  'clean': ['🧼'], 'dirty': ['🤢'], 'strong': ['💪'], 'weak': ['🥀'],
  'heavy': ['🏋️'], 'light': ['🪶'], 'round': ['⚪'], 'square': ['⬛'],
  'triangle': ['🔺'], 'long': ['📏'], 'wide': ['↔️'], 'narrow': ['↕️'],
  'thick': ['📚'], 'thin': ['📄'], 'quiet': ['🤫'], 'loud': ['🔊'],
  'bright': ['💡'], 'dark': ['🌑'],
  'school': ['🏫'], 'park': ['🌳'], 'zoo': ['🦓'], 'farm': ['🚜'],
  'shop': ['🏪'], 'library': ['📚'], 'hospital': ['🏥'],
};

const chineseEmojiMap = {
  '人': ['👤'], '口': ['👄'], '手': ['✋'], '日': ['☀️'], '月': ['🌙'],
  '水': ['💧'], '火': ['🔥'], '山': ['⛰️'], '石': ['🪨'], '田': ['🌾'],
  '土': ['🟫'], '木': ['🌳'], '花': ['🌸'], '草': ['🌱', '🌿'], '鸟': ['🐦'],
  '虫': ['🐛'], '鱼': ['🐟'], '马': ['🐴'], '牛': ['🐮'], '羊': ['🐑'],
  '犬': ['🐶'], '狗': ['🐶'], '目': ['👁️', '👀'], '耳': ['👂'], '心': ['❤️'],
  '门': ['🚪'], '米': ['🍚'], '车': ['🚗'], '云': ['☁️'], '雨': ['🌧️'],
  '风': ['💨', '🌬️'], '上': ['⬆️'], '下': ['⬇️'], '大': ['🐘', '📏'], '小': ['🐭', '🤏'],
  '多': ['➕'], '少': ['➖'], '中': ['🎯', '⏺️'], '工': ['🔧'], '天': ['🌌', '🌤️'],
  '地': ['🟩', '🌍', '🟫'], '王': ['👑'], '牙': ['🦷'], '足': ['🦶'], '头': ['🧑'],
  '毛': ['🧶'], '红': ['🔴'], '飞': ['✈️'], '笑': ['😄', '😊'],
  '猫': ['🐱'], '兔': ['🐰'], '猪': ['🐷'], '鸡': ['🐔'], '鸭': ['🦆'],
  '鹅': ['🦢'], '鼠': ['🐭'], '虎': ['🐯'], '狮': ['🦁'], '象': ['🐘'],
  '鹿': ['🦌'], '猴': ['🐵'], '熊': ['🐻'], '蛇': ['🐍'], '龙': ['🐉'],
  '龟': ['🐢'], '蛙': ['🐸'], '蜂': ['🐝'], '蝶': ['🦋'], '蚁': ['🐜'],
  '虾': ['🦐'], '蟹': ['🦀'], '贝': ['🐚'],
  '果': ['🍎'], '桃': ['🍑'], '梨': ['🍐'], '瓜': ['🍉'], '蕉': ['🍌'],
  '莓': ['🍓'], '饭': ['🍚'], '面': ['🍜'], '包': ['🥟', '🍞'], '蛋': ['🥚'],
  '肉': ['🍖'], '菜': ['🥬'], '汤': ['🍲'], '茶': ['🍵'], '奶': ['🥛'],
  '糖': ['🍬'], '盐': ['🧂'], '油': ['🫗'], '醋': ['🧴'],
  '锅': ['🍳'], '碗': ['🥣'], '筷': ['🥢'], '刀': ['🔪'], '叉': ['🍴'],
  '杯': ['🥤'], '壶': ['🫖'], '盘': ['🍽️'], '瓶': ['🍾'],
  '船': ['🚢'], '机': ['✈️'], '路': ['🛣️'], '桥': ['🌉'],
  '窗': ['🪟'], '房': ['🏠'], '家': ['🏠'], '屋': ['🏠'], '墙': ['🧱'],
  '桌': ['🪑'], '椅': ['🪑'], '床': ['🛏️'], '灯': ['💡'], '钟': ['🕰️'],
  '书': ['📚'], '笔': ['🖊️', '✏️'], '纸': ['📄'], '画': ['🎨'], '字': ['🔤'],
  '词': ['🔡'], '句': ['💬'], '文': ['📄'], '歌': ['🎵'], '舞': ['💃'],
  '球': ['⚽'], '旗': ['🚩'], '鼓': ['🥁'], '琴': ['🎹'], '伞': ['☂️'],
  '帽': ['🧢'], '鞋': ['👟'], '衣': ['👕'], '裤': ['👖'], '袜': ['🧦'], '裙': ['👗'],
  '镜': ['🪞'], '黄': ['🟡'], '蓝': ['🔵'], '绿': ['🟢'], '白': ['⚪'],
  '黑': ['⚫'], '粉': ['💗'], '紫': ['🟣'], '橙': ['🟠'], '灰': ['⬜'], '色': ['🎨'],
  '左': ['⬅️'], '右': ['➡️'], '前': ['👉'], '后': ['👈'], '里': ['📦'], '外': ['🌍'],
  '高': ['📏'], '低': ['📉'], '长': ['📏'], '短': ['✂️'], '远': ['🌅'], '近': ['👀'],
  '快': ['⚡'], '慢': ['🐢'], '新': ['✨'], '旧': ['🕰️'], '冷': ['❄️'], '热': ['🔥'],
  '干': ['🌵'], '湿': ['💦'], '轻': ['🪶'], '重': ['🏋️'], '甜': ['🍬'], '苦': ['🌿'],
  '香': ['👃'], '臭': ['💨'], '开': ['🔓'], '关': ['🔒'], '进': ['➡️'], '出': ['⬅️'],
  '来': ['🚶'], '去': ['🏃'], '生': ['🐣'], '死': ['💀'], '男': ['👦'], '女': ['👧'],
  '老': ['👴'], '哭': ['😢'], '问': ['❓'], '答': ['✅'], '买': ['🛒'], '卖': ['💰'],
  '好': ['👍'], '坏': ['👎'], '美': ['🌸'],
  '妈': ['👩'], '爸': ['👨'], '哥': ['👦'], '妹': ['👧'], '奶': ['🥛'], '皮': ['🧥'],
  '飞': ['✈️'], '兔': ['🐰'], '路': ['🛣️'], '考': ['📝'], '好': ['👍'], '橘': ['🍊'],
  '球': ['⚽'], '猪': ['🐷'], '树': ['🌳'], '祖': ['🏠'], '草': ['🌿'], '苏': ['🌾'],
  '鱼': ['🐟'], '五': ['5️⃣'], '白': ['⚪'], '豆': ['🫘'], '狗': ['🐶'], '花': ['🌸'],
  '牛': ['🐮'], '猫': ['🐱'], '波': ['🌊'], '怕': ['😨'], '摸': ['✋'], '发': ['💇'],
  '滴': ['💧'], '他': ['🧍'], '那': ['👉'], '拉': ['🤝'], '喝': ['🥤'], '卡': ['💳'],
  '八': ['8️⃣'], '一': ['1️⃣'], '二': ['2️⃣'], '三': ['3️⃣'], '四': ['4️⃣'],
  '六': ['6️⃣'], '七': ['7️⃣'], '八': ['8️⃣'], '九': ['9️⃣'], '十': ['🔟'],
  '太阳': ['☀️'], '月亮': ['🌙'], '星星': ['⭐'], '人们': ['👤'], '嘴巴': ['👄'],
  '小手': ['✋'], '喝水': ['💧'], '火苗': ['🔥'], '高山': ['⛰️'], '石头': ['🪨'],
  '田地': ['🌾'], '土地': ['🟫'], '树木': ['🌳'], '花朵': ['🌸'], '小鸟': ['🐦'],
  '虫子': ['🐛'], '小鱼': ['🐟'], '马儿': ['🐴'], '黄牛': ['🐮'], '山羊': ['🐑'],
  '小狗': ['🐶'], '眼睛': ['👀'], '耳朵': ['👂'], '心脏': ['❤️'], '大门': ['🚪'],
  '米饭': ['🍚'], '汽车': ['🚗'], '白云': ['☁️'], '下雨': ['🌧️'], '风儿': ['🌬️'],
  '上面': ['⬆️'], '下面': ['⬇️'], '大小': ['🐘', '🐭'], '多少': ['➕', '➖'],
  '中间': ['🎯'], '工人': ['🔧'], '天空': ['🌌'], '大地': ['🟩'], '国王': ['👑'],
  '牙齿': ['🦷'], '脚丫': ['🦶'], '脑袋': ['🧑'], '毛发': ['🧶'], '红色': ['🔴'],
  '飞翔': ['✈️'], '笑脸': ['😄'], '妈妈': ['👩'], '皮肤': ['🧥'], '牛奶': ['🥛'],
  '道路': ['🛣️'], '哥哥': ['👦'], '考试': ['📝'], '好坏': ['👍'], '橘子': ['🍊'],
  '皮球': ['⚽'], '兔子': ['🐰'], '小猪': ['🐷'], '大树': ['🌳'], '祖先': ['🏠'],
  '小草': ['🌿'], '苏醒': ['🌾'], '妹妹': ['👧'], '白色': ['⚪'], '豆子': ['🫘'],
  '波浪': ['🌊'], '害怕': ['😨'], '抚摸': ['✋'], '头发': ['💇'], '水滴': ['💧'],
  '他们': ['🧍'], '那里': ['👉'], '拉手': ['🤝'], '喝水': ['🥤'], '卡片': ['💳'],
  '左边': ['⬅️'], '右边': ['➡️'], '前面': ['👉'], '后面': ['👈'], '里面': ['📦'],
  '外面': ['🌍'], '打开': ['🔓'], '关闭': ['🔒'], '进去': ['➡️'], '出来': ['⬅️'],
  '进去': ['➡️'], '男孩': ['👦'], '女孩': ['👧'], '回答': ['✅'], '好坏': ['👍', '👎'],
  '美丽': ['🌸'],
};

const numberEmojiMap = {
  '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣', '5': '5️⃣',
  '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣',
};

console.log('=== 开始全面核对 emoji 与内容一致性 ===\n');

// Load JSON files
function loadJson(file) {
  try {
    return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
  } catch (e) {
    console.log(`⚠️  无法加载 ${file}: ${e.message}`);
    return null;
  }
}

const hanziBase = loadJson('hanzi.json');
const hanziExt = loadJson('hanzi-ext.json');
const englishBase = loadJson('english.json');
const englishExt = loadJson('english-ext.json');
const pinyinBase = loadJson('pinyin.json');
const pinyinFull = loadJson('pinyin-full.json');
const mathBase = loadJson('math.json');
const mathContent = loadJson('math-content.json');
const config = loadJson('config.json');

// Check hanzi base
if (hanziBase && hanziBase.cards) {
  console.log('--- 汉字基础库 (hanzi.json) ---');
  for (const card of hanziBase.cards) {
    const emo = getFirstEmoji(card.emoji);
    const expected1 = chineseEmojiMap[card.char];
    const expected2 = chineseEmojiMap[card.meaning];
    const expected = expected1 || expected2;
    if (emo && expected) {
      const ok = expected.includes(emo) || card.emoji.includes(expected[0]);
      if (!ok) {
        check(false, 'hanzi.json', `char=${card.char}`, `${card.char}(${card.meaning})`, card.emoji, expected.join('/'), '');
        console.log(`  ⚠️  字「${card.char}」(${card.meaning}): emoji=${card.emoji}, 可用emoji=${expected.join('/')}`);
      } else {
        check(true, 'hanzi.json', `char=${card.char}`, card.char, card.emoji);
      }
    } else if (!emo) {
      check(true, 'hanzi.json', `char=${card.char}`, card.char, null, null, '无emoji，跳过');
      stats.skipped++;
    } else {
      check(true, 'hanzi.json', `char=${card.char}`, card.char, card.emoji);
    }
  }
  console.log(`  已检查 ${hanziBase.cards.length} 个汉字\n`);
}

// Check hanzi ext
if (hanziExt && hanziExt.chars) {
  console.log('--- 汉字扩充库 (hanzi-ext.json) ---');
  let checked = 0;
  for (const char of hanziExt.chars) {
    if (!char.emoji) { stats.skipped++; continue; }
    const emo = getFirstEmoji(char.emoji);
    const expected1 = chineseEmojiMap[char.char];
    const expected2 = chineseEmojiMap[char.meaning];
    const expected = expected1 || expected2;
    checked++;
    if (emo && expected) {
      const ok = expected.includes(emo) || char.emoji.includes(expected[0]);
      if (!ok) {
        check(false, 'hanzi-ext.json', `char=${char.char}`, `${char.char}(${char.meaning})`, char.emoji, expected.join('/'), '');
      }
    } else {
      check(true, 'hanzi-ext.json', `char=${char.char}`, char.char, char.emoji);
    }
  }
  console.log(`  已检查 ${checked} 个汉字 (共${hanziExt.chars.length})\n`);
}

// Check english base
if (englishBase && englishBase.words) {
  console.log('--- 英语基础库 (english.json) ---');
  for (const word of englishBase.words) {
    const emo = getFirstEmoji(word.emoji);
    const w = word.word?.toLowerCase();
    const expected = englishEmojiMap[w];
    if (emo && expected) {
      const ok = expected.includes(emo) || word.emoji.includes(expected[0]);
      if (!ok) {
        check(false, 'english.json', `word=${word.word}`, `${word.word}(${word.meaning})`, word.emoji, expected.join('/'), '');
        console.log(`  ⚠️  单词「${word.word}」(${word.meaning}): emoji=${word.emoji}, 可用emoji=${expected.join('/')}`);
      } else {
        check(true, 'english.json', `word=${word.word}`, word.word, word.emoji);
      }
    } else if (!emo) {
      stats.skipped++;
    } else {
      check(true, 'english.json', `word=${word.word}`, word.word, word.emoji);
    }
  }
  console.log(`  已检查 ${englishBase.words.length} 个单词\n`);
}

// Check english ext
if (englishExt && englishExt.words) {
  console.log('--- 英语扩充库 (english-ext.json) ---');
  for (const word of englishExt.words) {
    const emo = getFirstEmoji(word.emoji);
    const w = word.word?.toLowerCase();
    const expected = englishEmojiMap[w];
    if (emo && expected) {
      const ok = expected.includes(emo) || word.emoji.includes(expected[0]);
      if (!ok) {
        check(false, 'english-ext.json', `word=${word.word}`, `${word.word}(${word.meaning})`, word.emoji, expected.join('/'), '');
        console.log(`  ⚠️  单词「${word.word}」(${word.meaning}): emoji=${word.emoji}, 可用emoji=${expected.join('/')}`);
      } else {
        check(true, 'english-ext.json', `word=${word.word}`, word.word, word.emoji);
      }
    } else if (!emo) {
      stats.skipped++;
    } else {
      check(true, 'english-ext.json', `word=${word.word}`, word.word, word.emoji);
    }
  }
  console.log(`  已检查 ${englishExt.words.length} 个单词\n`);
}

// Check pinyin base
if (pinyinBase && pinyinBase.syllables) {
  console.log('--- 拼音基础库 (pinyin.json) ---');
  for (const s of pinyinBase.syllables) {
    if (s.char && s.emoji) {
      const emo = getFirstEmoji(s.emoji);
      const expected1 = chineseEmojiMap[s.char];
      const expected2 = chineseEmojiMap[s.meaning];
      const expected = expected1 || expected2;
      if (emo && expected) {
        const ok = expected.includes(emo) || s.emoji.includes(expected[0]);
        if (!ok) {
          check(false, 'pinyin.json', `pinyin=${s.pinyin}`, `${s.char}(${s.meaning})`, s.emoji, expected.join('/'), '');
          console.log(`  ⚠️  拼音「${s.pinyin}」字「${s.char}」(${s.meaning}): emoji=${s.emoji}, 可用emoji=${expected.join('/')}`);
        } else {
          check(true, 'pinyin.json', `pinyin=${s.pinyin}`, s.char, s.emoji);
        }
      } else {
        check(true, 'pinyin.json', `pinyin=${s.pinyin}`, s.char, s.emoji);
      }
    } else {
      stats.skipped++;
    }
  }
  console.log(`  已检查 ${pinyinBase.syllables.filter(s=>s.char&&s.emoji).length} 个拼音\n`);
}

// Check pinyin full (if exists)
if (pinyinFull && pinyinFull.syllables) {
  console.log('--- 拼音完整库 (pinyin-full.json) ---');
  let checked = 0;
  for (const s of pinyinFull.syllables) {
    if (s.char && s.emoji) {
      checked++;
      const emo = getFirstEmoji(s.emoji);
      const expected1 = chineseEmojiMap[s.char];
      const expected2 = chineseEmojiMap[s.meaning];
      const expected = expected1 || expected2;
      if (emo && expected) {
        const ok = expected.includes(emo) || s.emoji.includes(expected[0]);
        if (!ok) {
          check(false, 'pinyin-full.json', `pinyin=${s.pinyin}`, `${s.char}(${s.meaning})`, s.emoji, expected.join('/'), '');
        }
      } else {
        check(true, 'pinyin-full.json', `pinyin=${s.pinyin}`, s.char, s.emoji);
      }
    }
  }
  console.log(`  已检查 ${checked} 个拼音\n`);
}

// Check math makeTen tiles
if (mathBase && mathBase.makeTen && mathBase.makeTen.tiles) {
  console.log('--- 数学凑十法数字 (math.json) ---');
  for (const tile of mathBase.makeTen.tiles) {
    const emo = getFirstEmoji(tile.emoji);
    const expected = numberEmojiMap[String(tile.value)];
    if (emo && expected) {
      const ok = emo === expected || tile.emoji.includes(expected);
      if (!ok) {
        check(false, 'math.json', `makeTen tile=${tile.value}`, tile.value, tile.emoji, expected, '');
        console.log(`  ⚠️  数字 ${tile.value}: emoji=${tile.emoji}, 期望=${expected}`);
      } else {
        check(true, 'math.json', `makeTen tile=${tile.value}`, tile.value, tile.emoji);
      }
    }
  }
  console.log(`  已检查 ${mathBase.makeTen.tiles.length} 个数字\n`);
}

// Check mathContent classification examples
if (mathContent && mathContent.logic && mathContent.logic.classify && mathContent.logic.classify.examples) {
  console.log('--- 数学分类例子 (math-content.json) ---');
  const mathExamples = {
    'bird': ['🐦'], 'bee': ['🐝'], 'plane': ['✈️'], 'fish': ['🐟'], 'cat': ['🐱'], 'elephant': ['🐘'],
    '鸟': ['🐦'], '蜜蜂': ['🐝'], '飞机': ['✈️'], '鱼': ['🐟'], '猫': ['🐱'], '大象': ['🐘'],
  };
  for (const ex of mathContent.logic.classify.examples) {
    const emo = getFirstEmoji(ex.emoji);
    const expected = mathExamples[ex.id] || mathExamples[ex.label];
    if (emo && expected) {
      const ok = expected.includes(emo) || ex.emoji.includes(expected[0]);
      if (!ok) {
        check(false, 'math-content.json', `classify=${ex.id}`, `${ex.label}`, ex.emoji, expected.join('/'), '');
        console.log(`  ⚠️  分类例子「${ex.label}」(${ex.group}): emoji=${ex.emoji}, 可用emoji=${expected.join('/')}`);
      } else {
        check(true, 'math-content.json', `classify=${ex.id}`, ex.label, ex.emoji);
      }
    }
  }
  console.log(`  已检查 ${mathContent.logic.classify.examples.length} 个分类例子\n`);
}

// Check config modules and achievements
console.log('--- 配置文件 (config.json) ---');
if (config && config.modules) {
  const expectedModuleIcons = {
    'math': '🔢', 'pinyin': '🔤', 'hanzi': '📚', 'english': '🔤',
    'poetry': '📜', 'geometry': '📐',
  };
  for (const mod of config.modules) {
    const emo = getFirstEmoji(mod.icon);
    const expected = expectedModuleIcons[mod.key];
    if (emo && expected && emo !== expected) {
      check(false, 'config.json', `module=${mod.key}`, mod.title, mod.icon, expected, '模块图标');
      console.log(`  ⚠️  模块「${mod.title}」: icon=${mod.icon}, 期望=${expected}`);
    } else {
      check(true, 'config.json', `module=${mod.key}`, mod.title, mod.icon);
    }
  }
  console.log(`  已检查 ${config.modules.length} 个模块图标`);
}
if (config && config.achievements) {
  for (const ach of config.achievements) {
    if (!hasEmoji(ach.icon)) {
      check(false, 'config.json', `achievement=${ach.id}`, ach.title, ach.icon, '需要emoji', '成就图标无emoji');
      console.log(`  ⚠️  成就「${ach.title}」: icon=${ach.icon} 无emoji`);
    } else {
      check(true, 'config.json', `achievement=${ach.id}`, ach.title, ach.icon);
    }
  }
  console.log(`  已检查 ${config.achievements.length} 个成就图标\n`);
}

// Check game registry icons (hardcoded from reading the files)
console.log('--- 游戏注册图标 ---');
const gameConfigs = [
  // Math
  { id: 'make-ten', module: 'math', title: '凑十法', icon: '🍎' },
  { id: 'plus-minus-link', module: 'math', title: '加减连连看', icon: '➕' },
  { id: 'number-merge', module: 'math', title: '数字合成', icon: '🔢' },
  { id: 'sudoku', module: 'math', title: '数独', icon: '🔢' },
  { id: 'sudoku-letter', module: 'math', title: '字母数独', icon: '🔠' },
  { id: 'sudoku-math', module: 'math', title: '算术数独', icon: '➕' },
  { id: 'number-mines', module: 'math', title: '数字地雷', icon: '💣' },
  { id: 'klotski', module: 'math', title: '华容道', icon: '🀄' },
  { id: 'multiplication', module: 'math', title: '乘法口诀', icon: '✖️' },
  { id: 'mult-speed', module: 'math', title: '速算擂台', icon: '⚡' },
  { id: 'mult-word', module: 'math', title: '应用题闯关', icon: '🧩' },
  // Pinyin
  { id: 'pinyin-match', module: 'pinyin', title: '声母韵母拼读', icon: '🔡' },
  { id: 'pinyin-variants', module: 'pinyin', title: '拼读变体', icon: '🎯' },
  { id: 'pinyin-listen', module: 'pinyin', title: '听音选拼音', icon: '🎧' },
  // Hanzi
  { id: 'flip-memory', module: 'hanzi', title: '翻牌记忆', icon: '🃏' },
  { id: 'connect-match', module: 'hanzi', title: '连线匹配', icon: '🔗' },
  { id: 'more-hanzi', module: 'hanzi', title: '趣味识字', icon: '✏️' },
  { id: 'match-3', module: 'hanzi', title: '汉字消消乐', icon: '🌈' },
  { id: 'brick-match-hanzi', module: 'hanzi', title: '砖块配对', icon: '🧱' },
  { id: 'goose-catch-hanzi', module: 'hanzi', title: '赶鹅配对', icon: '🪿' },
  // English
  { id: 'letter-case', module: 'english', title: '大小写配对', icon: '🔠' },
  { id: 'word-image', module: 'english', title: '单词图文', icon: '🖼️' },
  { id: 'sentence-fill', module: 'english', title: '句子填空', icon: '📝' },
  { id: 'battle-quiz', module: 'english', title: '答题大作战', icon: '⚔️' },
  { id: 'match-3-en', module: 'english', title: '英语消消乐', icon: '🌈' },
  { id: 'brick-match', module: 'english', title: '砖块配对', icon: '🧱' },
  { id: 'goose-catch', module: 'english', title: '赶鹅配对', icon: '🪿' },
  { id: 'vocab-drill', module: 'english', title: '核心词汇', icon: '📚' },
  // Poetry
  { id: 'poetry-cards', module: 'poetry', title: '必背古诗文', icon: '📜' },
  // Geometry
  { id: 'geometry-play', module: 'geometry', title: '图形与几何', icon: '📐' },
];

for (const game of gameConfigs) {
  if (!hasEmoji(game.icon)) {
    check(false, 'registry', `game=${game.id}`, game.title, game.icon, '需要emoji', '游戏图标无emoji');
    console.log(`  ⚠️  游戏「${game.title}」: icon=${game.icon} 无emoji`);
  } else {
    check(true, 'registry', `game=${game.id}`, game.title, game.icon);
  }
}
console.log(`  已检查 ${gameConfigs.length} 个游戏图标\n`);

// Check poetry data
console.log('--- 诗词模块 ---');
try {
  const poemsPath = join(gamesDir, 'poetry', 'poems.ts');
  const poemsContent = readFileSync(poemsPath, 'utf-8');
  const poemEmojiMatches = [...poemsContent.matchAll(/emoji:\s*['"]([^'"]+)['"]/g)];
  console.log(`  找到 ${poemEmojiMatches.length} 个诗词emoji引用`);
  for (const m of poemEmojiMatches) {
    const emo = m[1];
    if (!hasEmoji(emo)) {
      check(false, 'poems.ts', 'poem emoji', '', emo, '需要emoji', '诗词无emoji');
      console.log(`  ⚠️  诗词emoji异常: ${emo}`);
    } else {
      check(true, 'poems.ts', 'poem emoji', '', emo);
    }
  }
  console.log('');
} catch (e) {
  console.log(`  ⚠️  无法读取诗词文件: ${e.message}\n`);
}

// Check geometry data
console.log('--- 几何模块 ---');
try {
  const geoLogicPath = join(gamesDir, 'geometry', 'geometryLogic.ts');
  const geoContent = readFileSync(geoLogicPath, 'utf-8');
  const geoEmojiMatches = [...geoContent.matchAll(/emoji:\s*['"]([^'"]+)['"]/g)];
  console.log(`  找到 ${geoEmojiMatches.length} 个几何emoji引用`);
  for (const m of geoEmojiMatches) {
    const emo = m[1];
    if (!hasEmoji(emo)) {
      check(false, 'geometryLogic.ts', 'geometry emoji', '', emo, '需要emoji', '几何无emoji');
      console.log(`  ⚠️  几何emoji异常: ${emo}`);
    } else {
      check(true, 'geometryLogic.ts', 'geometry emoji', '', emo);
    }
  }
  console.log('');
} catch (e) {
  console.log(`  ⚠️  无法读取几何文件: ${e.message}\n`);
}

// Final summary
console.log('=== 核对总结 ===');
console.log(`总检查项: ${stats.total}`);
console.log(`通过: ${stats.passed}`);
console.log(`疑似不一致: ${stats.issues}`);
console.log(`跳过(无emoji): ${stats.skipped}`);

if (issues.length > 0) {
  console.log('\n=== 疑似不一致详情 ===');
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }
  for (const [file, fileIssues] of Object.entries(byFile)) {
    console.log(`\n[${file}] (${fileIssues.length}项)`);
    for (const issue of fileIssues) {
      console.log(`  - ${issue.field}: "${issue.value}" emoji="${issue.emoji}" ${issue.expected ? '可用/期望: ' + issue.expected : ''} ${issue.note || ''}`);
    }
  }
} else {
  console.log('\n✅ 未发现明显的emoji与内容不匹配问题！所有图片(emoji)与对应信息一致。');
}
