#!/usr/bin/env python3
"""
批量生成英语单词配图，优先使用火山引擎 Seedream 5.0-lite 模型，
无 API Key 时自动降级到 TRAE 内置 text_to_image API。
保存 PNG 格式到 public/images/words/ 并更新 word-images.json。
"""
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
from urllib.parse import quote

# 添加 skill 脚本路径
SKILL_SCRIPTS = Path(r"c:\Users\Administrator\.trae-cn\skills\byted-seedream-image-generate\scripts")
sys.path.insert(0, str(SKILL_SCRIPTS))

API_KEY = (
    os.getenv("ARK_API_KEY")
    or os.getenv("MODEL_IMAGE_API_KEY")
    or os.getenv("MODEL_AGENT_API_KEY")
)

USE_TRAE_API = not API_KEY
TRAE_API = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"

if API_KEY:
    from seedream_image_generate import seedream_generate  # type: ignore

ROOT = Path(__file__).parent.parent
IMAGES_DIR = ROOT / "public" / "images" / "words"
VOCAB_PATH = ROOT / "src" / "data" / "vocabData.ts"
MAPPING_PATH = ROOT / "src" / "data" / "word-images.json"

THEME_DESC = {
    "数字": "bright colorful number digit illustration",
    "颜色": "vibrant color swatch sample illustration",
    "家庭成员": "warm family member character portrait",
    "动物": "cute adorable animal character illustration",
    "食物与饮品": "delicious appetizing food and drink illustration",
    "身体部位": "cartoon child pointing to body part illustration",
    "学校用品": "colorful school stationery supply illustration",
    "自然与天气": "beautiful nature weather landscape illustration",
    "方位": "spatial direction preposition concept illustration",
    "时间": "clock calendar time concept illustration",
    "课堂用语": "cheerful classroom school activity illustration",
    "节日": "festive holiday celebration decoration illustration",
    "衣着": "colorful clothing fashion item illustration",
    "运动": "sports equipment athletic activity illustration",
    "常见动词": "cartoon child performing action verb illustration",
    "常见形容词": "adjective concept descriptive illustration",
    "常见名词": "everyday household object item illustration",
}

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
            "en": en,
            "zh": m.group(2),
            "pos": m.group(3),
            "example": m.group(4) or "",
            "theme": m.group(5),
        })
    return vocab

def build_prompt(word):
    desc = THEME_DESC.get(word["theme"], "everyday object illustration")
    return (
        f"children's picture book illustration, cute kawaii cartoon style, "
        f"{desc}, single centered object: {word['zh']} ({word['en']}), "
        f"simple flat design, pure white background, no text, no letters, no words, "
        f"educational flashcard for kids, soft pastel colors, 4k quality"
    )

def download_image(url, dest_path, timeout=60):
    req = urlopen(url, timeout=timeout)
    data = req.read()
    if len(data) < 50000:
        return False, f"file too small: {len(data)} bytes"
    if data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n":
        dest_path.write_bytes(data)
        return True, f"saved {len(data)//1024}KB"
    return False, f"unknown format: {data[:8].hex()}"

def trae_generate_image(prompt, timeout=120):
    url = f"{TRAE_API}?prompt={quote(prompt)}&image_size=square_hd"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urlopen(req, timeout=timeout)
    content_type = resp.headers.get("Content-Type", "")
    
    if content_type.startswith("image/"):
        return resp.read()
    
    data = json.loads(resp.read().decode("utf-8"))
    if isinstance(data, dict):
        img_url = data.get("url") or data.get("data", {}).get("url") or data.get("image_url")
        if img_url:
            img_resp = urlopen(img_url, timeout=timeout)
            return img_resp.read()
        b64 = data.get("b64_json") or data.get("data", {}).get("b64_json") or data.get("image")
        if b64:
            import base64
            return base64.b64decode(b64)
    raise ValueError(f"Unexpected response: {str(data)[:200]}")

async def generate_batch(vocab_batch, batch_idx, total_batches, version="5.0"):
    print(f"\nBatch {batch_idx+1}/{total_batches}: generating {len(vocab_batch)} images...")
    
    if USE_TRAE_API:
        return await generate_batch_trae(vocab_batch, batch_idx, total_batches)
    
    tasks = []
    word_map = []
    for w in vocab_batch:
        tasks.append({
            "prompt": build_prompt(w),
            "size": "1024x1024",
            "watermark": False,
            "output_format": "png",
            "response_format": "url",
        })
        word_map.append(w["en"])

    result = await seedream_generate(tasks, version=version, timeout=300)

    if result["status"] != "success":
        print(f"  Batch failed: {result['error_list']}")
        return [], [(w, str(e)) for w, e in zip(word_map, result["error_detail_list"])]

    success = []
    failed = []
    for i, item in enumerate(result["success_list"]):
        for img_name, img_url in item.items():
            word_en = word_map[i] if i < len(word_map) else img_name
            dest = IMAGES_DIR / f"{word_en}.png"
            try:
                ok, msg = download_image(img_url, dest)
                if ok:
                    print(f"  ✅ {word_en}: {msg}")
                    success.append(word_en)
                else:
                    print(f"  ❌ {word_en}: {msg}")
                    failed.append((word_en, msg))
            except Exception as e:
                print(f"  ❌ {word_en}: download error: {e}")
                failed.append((word_en, str(e)))
        if i >= len(word_map) - 1:
            break

    return success, failed

async def generate_batch_trae(vocab_batch, batch_idx, total_batches):
    success = []
    failed = []
    loop = asyncio.get_event_loop()
    
    for i, w in enumerate(vocab_batch):
        word_en = w["en"]
        prompt = build_prompt(w)
        dest = IMAGES_DIR / f"{word_en}.png"
        print(f"  [{i+1}/{len(vocab_batch)}] Generating {word_en} ({w['zh']})...")
        
        try:
            data = await loop.run_in_executor(None, lambda: trae_generate_image(prompt))
            if len(data) < 50000:
                print(f"  ❌ {word_en}: file too small ({len(data)} bytes), possible placeholder")
                failed.append((word_en, f"file too small: {len(data)} bytes"))
                await asyncio.sleep(2)
                continue
            if data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n":
                dest.write_bytes(data)
                print(f"  ✅ {word_en}: saved {len(data)//1024}KB")
                success.append(word_en)
            else:
                print(f"  ❌ {word_en}: unknown format {data[:8].hex()}")
                failed.append((word_en, f"unknown format: {data[:8].hex()}"))
        except Exception as e:
            print(f"  ❌ {word_en}: error: {e}")
            failed.append((word_en, str(e)))
        
        if i < len(vocab_batch) - 1:
            await asyncio.sleep(1)
    
    return success, failed

async def main():
    force = "--force" in sys.argv
    category = None
    limit = 0
    retries = 3
    for i, arg in enumerate(sys.argv):
        if arg == "--category" and i + 1 < len(sys.argv):
            category = sys.argv[i + 1]
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        if arg == "--retries" and i + 1 < len(sys.argv):
            retries = int(sys.argv[i + 1])

    vocab = load_vocab()
    if category:
        vocab = [w for w in vocab if w["theme"] == category]
    if limit > 0:
        vocab = vocab[:limit]

    # Skip existing valid images
    existing = set()
    if not force:
        for f in IMAGES_DIR.glob("*.png"):
            try:
                data = f.read_bytes()
                if len(data) >= 50000 and (data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n"):
                    existing.add(f.stem)
            except Exception:
                pass

    to_generate = [w for w in vocab if w["en"] not in existing]
    print(f"=== 单词配图批量生成 (Seedream) ===")
    print(f"总单词: {len(vocab)}, 已有: {len(existing)}, 待生成: {len(to_generate)}")
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    if not to_generate:
        print("无需生成，更新映射文件...")
        update_mapping(vocab)
        return

    BATCH_SIZE = 5
    all_success = list(existing)
    all_failed = []

    batches = [to_generate[i:i+BATCH_SIZE] for i in range(0, len(to_generate), BATCH_SIZE)]

    for bidx, batch in enumerate(batches):
        success, failed = await generate_batch(batch, bidx, len(batches))
        all_success.extend(success)
        all_failed.extend(failed)
        if bidx < len(batches) - 1:
            await asyncio.sleep(2)

    # Retry failed with longer waits
    retry_words = [w for w, _ in all_failed]
    for attempt in range(2, retries + 1):
        if not retry_words:
            break
        print(f"\n=== Retry attempt {attempt}/{retries} for {len(retry_words)} words ===")
        retry_batch = [w for w in to_generate if w["en"] in set(retry_words)]
        success, failed = await generate_batch(retry_batch, 0, 1)
        all_success.extend(success)
        retry_words = [w for w, _ in failed]
        all_failed = failed
        await asyncio.sleep(5 * attempt)

    update_mapping(vocab)

    print(f"\n=== 完成 ===")
    print(f"成功: {len(all_success)}, 失败: {len(all_failed)}")
    if all_failed:
        print("失败列表:")
        for w, e in all_failed:
            print(f"  - {w}: {e}")

def update_mapping(vocab):
    mapping = {}
    for w in vocab:
        p = IMAGES_DIR / f"{w['en']}.png"
        if p.exists():
            try:
                data = p.read_bytes()
                if len(data) >= 50000 and (data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n"):
                    mapping[w["en"]] = f"/images/words/{w['en']}.png"
            except Exception:
                pass
    MAPPING_PATH.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"映射文件更新: {MAPPING_PATH} ({len(mapping)} words)")

if __name__ == "__main__":
    asyncio.run(main())
