#!/usr/bin/env python3
"""
genWordImages.py —— 批量生成英语单词配图（TRAE text_to_image API + PIL压缩）。

用法：
  python scripts/genWordImages.py                 # 增量生成全部缺失图片
  python scripts/genWordImages.py --limit 5       # 只生成前5张（测试）
  python scripts/genWordImages.py --force         # 强制覆盖
  python scripts/genWordImages.py --category 动物 # 仅指定分类
"""
import json, re, sys, time, argparse, urllib.request, urllib.parse, io, os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
TRAE_API = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"
IMAGES_DIR = ROOT / "public" / "images" / "words"
MAPPING_PATH = ROOT / "src" / "data" / "word-images.json"
VOCAB_PATH = ROOT / "src" / "data" / "vocabData.ts"

PLACEHOLDER_SIZES = {176626}
MIN_VALID_SIZE = 5000
MAX_RETRIES = 4
SLEEP_BETWEEN = 1.5
COMPRESS_SIZE = 448
JPEG_QUALITY = 80
TARGET_SIZE_KB = 50

THEME_DESC = {
    "数字": "bright colorful number digit",
    "颜色": "vibrant color swatch sample",
    "家庭成员": "warm family member portrait",
    "动物": "cute adorable animal character",
    "食物与饮品": "delicious appetizing food and drink",
    "身体部位": "cartoon character body part",
    "学校用品": "colorful school stationery supply",
    "自然与天气": "beautiful nature weather landscape",
    "方位": "spatial direction concept illustration",
    "时间": "clock calendar time concept",
    "课堂用语": "cheerful classroom school activity",
    "节日": "festive holiday celebration decoration",
    "衣着": "colorful clothing fashion item",
    "运动": "sports equipment athletic activity",
    "常见动词": "cartoon character performing action verb",
    "常见形容词": "adjective concept descriptive illustration",
    "常见名词": "everyday household object item",
}

def build_prompt(word):
    desc = THEME_DESC.get(word["theme"], "everyday object")
    return (
        f"children's book illustration style, cute kawaii {desc}, "
        f"single centered object: {word['zh']} ({word['en']}), "
        f"simple flat design, pure white background, no text, no letters, no words, "
        f"educational flashcard, soft pastel colors, high quality, 4k"
    )

def load_vocab():
    content = VOCAB_PATH.read_text(encoding="utf-8")
    start = content.index("export const VOCAB")
    end = content.index("export const VOCAB_BY_THEME")
    block = content[start:end]
    pattern = re.compile(
        r'\{\s*en:\s*"([^"]+)",\s*zh:\s*"([^"]+)",\s*pos:\s*"([^"]+)"'
        r'(?:,\s*example:\s*"([^"]*)")?,\s*theme:\s*"([^"]+)"'
    )
    seen = set()
    vocab = []
    for m in pattern.finditer(block):
        en = m.group(1)
        if en in seen:
            continue
        seen.add(en)
        vocab.append({
            "en": en, "zh": m.group(2), "pos": m.group(3),
            "example": m.group(4) or "", "theme": m.group(5),
        })
    return vocab

def is_valid_image(buf):
    if not buf or len(buf) < MIN_VALID_SIZE:
        return False
    if len(buf) in PLACEHOLDER_SIZES:
        return False
    if buf[:2] == b'\xff\xd8' or buf[:4] == b'\x89PNG':
        return True
    return False

def compress_image(raw_bytes):
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    if img.size != (COMPRESS_SIZE, COMPRESS_SIZE):
        img = img.resize((COMPRESS_SIZE, COMPRESS_SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()

def generate_one(prompt, retries=MAX_RETRIES):
    url = f"{TRAE_API}?prompt={urllib.parse.quote(prompt)}&image_size=square"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urllib.request.urlopen(req, timeout=120)
            raw = resp.read()
            if is_valid_image(raw):
                return raw
            print(f"    重试 {attempt+1}/{retries}（占位图/无效，等待...）")
        except Exception as e:
            print(f"    重试 {attempt+1}/{retries}（{e}）")
        if attempt < retries - 1:
            time.sleep(4 * (attempt + 1))
    return None

def update_mapping(vocab):
    mapping = {}
    for w in vocab:
        p = IMAGES_DIR / f"{w['en']}.png"
        if p.exists() and p.stat().st_size >= MIN_VALID_SIZE:
            mapping[w["en"]] = f"/images/words/{w['en']}.png"
    MAPPING_PATH.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(mapping)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--category", type=str, default=None)
    parser.add_argument("--retries", type=int, default=MAX_RETRIES)
    args = parser.parse_args()

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    vocab = load_vocab()

    if args.category:
        vocab = [w for w in vocab if w["theme"] == args.category]
        if not vocab:
            themes = sorted(set(w["theme"] for w in load_vocab()))
            print(f"未找到分类「{args.category}」。可用分类：{', '.join(themes)}")
            sys.exit(1)

    if args.limit > 0:
        vocab = vocab[:args.limit]

    total = len(vocab)
    print(f"=== 英语单词配图生成工具 (TRAE API) ===")
    print(f"目标数量: {total}")
    print(f"压缩设置: {COMPRESS_SIZE}px, JPEG q={JPEG_QUALITY}")
    print(f"模式: {'强制覆盖' if args.force else '增量生成'}")
    print()

    success = 0
    skipped = 0
    failed = []

    for i, word in enumerate(vocab, 1):
        en = word["en"]
        dest = IMAGES_DIR / f"{en}.png"

        if not args.force and dest.exists():
            existing = dest.read_bytes()
            if is_valid_image(existing):
                skipped += 1
                continue
            print(f"[{i}/{total}] {en} ({word['zh']}) [{word['theme']}] - 现有文件无效，重新生成")
        else:
            print(f"[{i}/{total}] {en} ({word['zh']}) [{word['theme']}]")

        prompt = build_prompt(word)
        raw = generate_one(prompt, args.retries)

        if raw is None:
            failed.append(en)
            print(f"  ❌ 失败")
            time.sleep(SLEEP_BETWEEN)
            continue

        compressed = compress_image(raw)
        dest.write_bytes(compressed)
        size_kb = len(compressed) / 1024
        print(f"  ✅ {dest.name} ({size_kb:.1f} KB)")
        success += 1
        time.sleep(SLEEP_BETWEEN)

    count = update_mapping(load_vocab())
    print(f"\n=== 生成总结 ===")
    print(f"成功: {success}")
    print(f"跳过: {skipped}")
    print(f"失败: {len(failed)}")
    print(f"映射总数: {count}")
    if failed:
        print(f"\n失败列表: {', '.join(failed)}")

if __name__ == "__main__":
    main()
