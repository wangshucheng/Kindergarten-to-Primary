"""
为 vocabData.ts 中的所有单词生成完整的 emoji 映射。
输出到 src/data/word-emojis.json
"""
import re
import json
from pathlib import Path

ROOT = Path(r'c:\Users\Administrator\WorkBuddy\2026-07-07-11-52-57')
vocab_path = ROOT / 'src' / 'data' / 'vocabData.ts'
content = vocab_path.read_text(encoding='utf-8')

# Extract all WordEntry objects - handle multi-word en values too
pattern = re.compile(
    r'\{\s*en:\s*"([^"]+)",\s*zh:\s*"([^"]+)",\s*pos:\s*"([^"]+)"'
    r'(?:,\s*example:\s*"([^"]*)")?,\s*theme:\s*"([^"]+)"'
)

words = []
seen = set()
for m in pattern.finditer(content):
    en = m.group(1)
    if en in seen:
        continue
    seen.add(en)
    words.append({
        'en': en,
        'zh': m.group(2),
        'pos': m.group(3),
        'theme': m.group(5),
    })

print(f'Total unique words: {len(words)}')

# ============================================================
# Emoji mapping - keyed by the exact "en" value
# ============================================================
EMOJI = {
    # ---- 数字 Numbers ----
    "one": "1️⃣", "two": "2️⃣", "three": "3️⃣", "four": "4️⃣", "five": "5️⃣",
    "six": "6️⃣", "seven": "7️⃣", "eight": "8️⃣", "nine": "9️⃣", "ten": "🔟",
    "eleven": "1️⃣", "twelve": "1️⃣", "thirteen": "1️⃣", "fourteen": "1️⃣",
    "fifteen": "1️⃣", "sixteen": "1️⃣", "seventeen": "1️⃣", "eighteen": "1️⃣",
    "nineteen": "1️⃣", "twenty": "2️⃣", "thirty": "3️⃣", "forty": "4️⃣",
    "fifty": "5️⃣", "sixty": "6️⃣", "seventy": "7️⃣", "eighty": "8️⃣",
    "ninety": "9️⃣", "hundred": "💯", "first": "🥇", "second": "🥈",

    # ---- 颜色 Colors ----
    "red": "🔴", "orange": "🟠", "yellow": "🟡", "green": "🟢", "blue": "🔵",
    "purple": "🟣", "pink": "🩷", "black": "⚫", "white": "⚪", "gray": "🩶",
    "brown": "🟤", "gold": "🌟", "silver": "🥈", "light": "🔆", "dark": "🌑",
    "navy": "🫐", "cream": "🥛", "multicolor": "🌈",

    # ---- 家庭成员 Family ----
    "father": "👨", "mother": "👩", "parents": "👨‍👩", "grandfather": "👴",
    "grandmother": "👵", "grandparents": "👴‍👵", "son": "👦", "daughter": "👧",
    "brother": "👬", "sister": "👭", "baby": "👶", "uncle": "🧔",
    "aunt": "👩‍🦱", "cousin": "🧑‍🤝‍🧑", "me": "🧒", "nephew": "👦", "niece": "👧",

    # ---- 动物 Animals ----
    "cat": "🐱", "dog": "🐶", "pig": "🐷", "cow": "🐮", "sheep": "🐑",
    "horse": "🐴", "duck": "🦆", "chicken": "🐔", "fish": "🐟", "bird": "🐦",
    "rabbit": "🐰", "mouse": "🐭", "tiger": "🐯", "lion": "🦁", "elephant": "🐘",
    "monkey": "🐵", "panda": "🐼", "bear": "🐻", "fox": "🦊", "wolf": "🐺",
    "snake": "🐍", "frog": "🐸", "bee": "🐝", "butterfly": "🦋", "ant": "🐜",
    "spider": "🕷️", "turtle": "🐢", "giraffe": "🦒", "zebra": "🦓", "kangaroo": "🦘",
    "penguin": "🐧", "owl": "🦉", "goose": "🪿", "deer": "🦌", "goat": "🐐",
    "hen": "🐔", "rooster": "🐓", "worm": "🪱", "snail": "🐌", "shark": "🦈",
    "dolphin": "🐬", "whale": "🐋", "seal": "🦭", "camel": "🐫", "bat": "🦇",
    "peacock": "🦚",

    # ---- 食物与饮品 Food & Drinks ----
    "rice": "🍚", "noodles": "🍜", "bread": "🍞", "egg": "🥚", "meat": "🥩",
    "beef": "🥩", "pork": "🥓", "cake": "🎂", "cookie": "🍪", "candy": "🍬",
    "chocolate": "🍫", "apple": "🍎", "banana": "🍌", "pear": "🍐",
    "grape": "🍇", "watermelon": "🍉", "strawberry": "🍓", "mango": "🥭",
    "peach": "🍑", "lemon": "🍋", "milk": "🥛", "water": "💧",
    "juice": "🧃", "tea": "🍵", "coffee": "☕", "soup": "🍲",
    "rice ball": "🍙", "dumpling": "🥟", "porridge": "🥣", "ice cream": "🍦",
    "cabbage": "🥬", "bean": "🫘", "bowl": "🥣", "plate": "🍽️",
    "pizza": "🍕", "hamburger": "🍔", "hot dog": "🌭", "sandwich": "🥪",
    "salad": "🥗", "popcorn": "🍿", "french fries": "🍟", "cheese": "🧀",
    "butter": "🧈", "honey": "🍯", "jam": "🫙", "salt": "🧂", "sugar": "🍬",
    "vegetable": "🥬", "carrot": "🥕", "potato": "🥔", "tomato": "🍅",
    "corn": "🌽", "onion": "🧅", "mushroom": "🍄", "icecream": "🍦",
    "food": "🍽️", "breakfast": "🌅", "lunch": "☀️", "dinner": "🌙",

    # ---- 身体部位 Body parts ----
    "head": "🧠", "hair": "💇", "face": "😊", "eye": "👁️", "ear": "👂",
    "nose": "👃", "mouth": "👄", "tooth": "🦷", "tongue": "👅", "neck": "🦒",
    "shoulder": "💪", "arm": "💪", "hand": "✋", "finger": "👆", "leg": "🦵",
    "foot": "🦶", "toe": "🦶", "knee": "🦵", "body": "🧍", "back": "🔙",
    "stomach": "🫃", "heart": "❤️", "elbow": "💪",

    # ---- 学校用品 School supplies ----
    "book": "📖", "pen": "🖊️", "pencil": "✏️", "eraser": "🧽", "ruler": "📏",
    "bag": "🎒", "desk": "🪑", "chair": "💺", "paper": "📄", "notebook": "📓",
    "crayon": "🖍️", "scissors": "✂️", "glue": "🧴", "marker": "🖊️", "paint": "🎨",
    "blackboard": "📋", "chalk": "🖍️", "sharpener": "✏️", "backpack": "🎒",
    "pencil case": "🎒", "board": "📋", "bell": "🔔", "classroom": "🏫",
    "school": "🏫", "homework": "📝", "clock": "⏰",

    # ---- 自然与天气 Nature & Weather ----
    "sun": "☀️", "moon": "🌙", "star": "⭐", "sky": "🌌", "cloud": "☁️",
    "rain": "🌧️", "snow": "❄️", "wind": "💨", "rainbow": "🌈", "tree": "🌳",
    "flower": "🌸", "grass": "🌿", "leaf": "🍃", "mountain": "⛰️", "river": "🏞️",
    "sea": "🌊", "lake": "💧", "stone": "🪨", "sand": "🏖️", "earth": "🌍",
    "weather": "🌤️", "storm": "⛈️", "fog": "🌫️", "thunder": "⚡", "ice": "🧊",
    "hot": "🔥", "cold": "🥶", "warm": "🌡️", "cool": "🍃",
    "world": "🌍", "plant": "🌱", "hill": "⛰️", "island": "🏝️",
    "sunny": "☀️", "rainy": "🌧️", "cloudy": "☁️", "windy": "🌬️", "snowy": "🌨️",
    "foggy": "🌫️",

    # ---- 方位 Directions ----
    "up": "⬆️", "down": "⬇️", "left": "⬅️", "right": "➡️", "front": "🔜",
    "back": "🔙", "in": "📥", "out": "📤", "on": "🔝", "under": "👇",
    "near": "📍", "far": "🔭", "here": "📍", "there": "👉", "between": "↔️",
    "next to": "👉", "behind": "🔙", "beside": "↔️", "above": "⬆️", "below": "⬇️",
    "in front of": "👁️", "top": "🔝", "bottom": "👇",

    # ---- 时间 Time ----
    "morning": "🌅", "afternoon": "☀️", "evening": "🌆", "night": "🌃",
    "day": "📅", "week": "📆", "month": "🗓️", "year": "📅", "today": "📌",
    "tomorrow": "➡️", "yesterday": "⬅️", "now": "⏰", "o'clock": "🕐",
    "hour": "⏱️", "minute": "⏲️", "second": "⏱️",
    "Monday": "📅", "Tuesday": "📅", "Wednesday": "📅", "Thursday": "📅",
    "Friday": "📅", "Saturday": "📅", "Sunday": "📅",
    "spring": "🌸", "summer": "☀️", "autumn": "🍂", "winter": "⛄",
    "soon": "⏳", "always": "♾️", "often": "🔁", "sometimes": "🔀", "never": "🚫",
    "season": "🍂", "date": "📅", "birthday": "🎂", "time": "⏰",

    # ---- 课堂用语 Classroom ----
    "hello": "👋", "hi": "👋", "goodbye": "👋", "please": "🙏", "thanks": "🙏",
    "thank you": "🙏", "sorry": "😔", "excuse me": "🙋", "yes": "✅", "no": "❌",
    "ok": "👌", "good": "👍", "bad": "👎", "stand up": "🧍", "sit down": "🪑",
    "come": "👉", "go": "🚶", "listen": "👂", "look": "👀", "speak": "🗣️",
    "read": "📖", "write": "✍️", "draw": "🎨", "sing": "🎤", "dance": "💃",
    "open": "📂", "close": "📕", "question": "❓", "answer": "💡",
    "class": "🏫", "teacher": "👨‍🏫", "student": "🧑‍🎓", "friend": "🤝",
    "line up": "🧑‍🤝‍🧑", "quiet": "🤫", "loud": "📢", "repeat": "🔁",
    "again": "🔄", "ready": "✅", "start": "▶️", "stop": "⏹️", "clean": "🧹",
    "help": "🆘", "share": "🤝", "turn": "🔄", "wait": "⏳", "welcome": "🤗",
    "lesson": "📚", "test": "📝", "sentence": "💬", "page": "📄",
    "practice": "✏️", "group": "👥", "pair": "👫", "hand up": "🙋",
    "what": "❓", "who": "❓", "where": "❓", "when": "❓", "why": "❓",
    "how": "❓", "which": "❓",

    # ---- 节日 Holidays ----
    "Spring Festival": "🧧", "New Year": "🎊", "Lantern Festival": "🏮",
    "Dragon Boat Festival": "🐉", "Mid-Autumn Festival": "🥮",
    "National Day": "🇨🇳", "Children's Day": "🎈", "Teachers' Day": "👩‍🏫",
    "Christmas": "🎄", "Halloween": "🎃", "Thanksgiving": "🦃",
    "Birthday": "🎂", "holiday": "🎉", "party": "🎈", "gift": "🎁",
    "firework": "🎆", "card": "💌", "flower_holiday": "💐",

    # ---- 衣着 Clothing ----
    "shirt": "👕", "pants": "👖", "dress": "👗", "skirt": "👗", "coat": "🧥",
    "jacket": "🧥", "hat": "🎩", "cap": "🧢", "shoe": "👟", "sock": "🧦",
    "glove": "🧤", "scarf": "🧣", "T-shirt": "👕", "sweater": "🧶",
    "shorts": "🩳", "boot": "🥾", "sandal": "🩴", "uniform": "👔",
    "clothes": "👚", "wear": "👔", "button": "🔘", "pocket": "👖",
    "zipper": "🤐", "shoes": "👟", "socks": "🧦", "gloves": "🧤",
    "boots": "🥾", "raincoat": "🧥", "glasses": "👓", "belt": "🎗️",
    "new": "🆕", "old": "👴",

    # ---- 运动 Sports ----
    "run": "🏃", "jump": "🦘", "swim": "🏊", "walk": "🚶", "play": "🎮",
    "ball": "⚽", "football": "⚽", "basketball": "🏀", "ping-pong": "🏓",
    "badminton": "🏸", "tennis": "🎾", "baseball": "⚾", "soccer": "⚽",
    "volleyball": "🏐", "skate": "⛸️", "bike": "🚲", "bicycle": "🚲",
    "skip": "🪢", "rope": "🪢", "race": "🏁", "sport": "🏆",
    "game": "🎯", "win": "🏆", "lose": "😞", "team": "👥", "match": "🤼",
    "exercise": "🏋️", "yoga": "🧘", "stretch": "🤸",
    "throw": "🎯", "catch": "🤲", "kick": "🦵", "hit": "🏓", "push": "🤸",
    "pull": "🏋️",

    # ---- 常见动词 Verbs ----
    "eat": "🍽️", "drink": "🥤", "sleep": "😴", "wake": "⏰", "sit": "🪑",
    "stand": "🧍", "fly": "🕊️", "cook": "👨‍🍳", "wash": "🧼",
    "carry": "🎒", "give": "🎁", "take": "✋", "buy": "🛒", "sell": "💰",
    "make": "🔨", "build": "🏗️", "cut": "✂️", "put": "📦", "find": "🔍",
    "see": "👀", "hear": "👂", "smell": "👃", "taste": "👅", "touch": "✋",
    "love": "❤️", "like": "👍", "want": "🤲", "need": "🆘", "know": "🧠",
    "think": "🤔", "learn": "📚", "teach": "👩‍🏫", "study": "📖", "work": "💼",
    "watch": "📺", "laugh": "😂", "cry": "😢", "smile": "😊",
    "talk": "💬", "say": "🗣️", "tell": "📢", "ask": "❓",
    "call": "📱", "drive": "🚗", "ride": "🚴",
    "be": "✨", "look for": "🔍", "grow": "🌱", "bring": "🎁", "show": "👁️",
    "count": "🔢", "use": "🔧", "live": "🏠", "follow": "👉",
    "is": "✨", "are": "✨", "am": "✨", "was": "⏪", "were": "⏪",
    "have": "✅", "has": "✅", "had": "✅", "do": "✔️", "does": "✔️",
    "did": "✔️", "go": "🚀", "goes": "🚀", "went": "🚀", "come": "🤗",
    "get": "📥", "got": "📥", "can": "💪", "could": "💪", "will": "🔮",
    "would": "🔮", "shall": "🔮", "should": "✅", "may": "🤔", "might": "🤔",
    "must": "⚠️", "climb": "🧗",

    # ---- 常见形容词 Adjectives ----
    "big": "🐘", "small": "🐭", "tall": "🦒", "short": "🐜", "long": "📏",
    "fat": "🐷", "thin": "🦴", "young": "👶",
    "happy": "😊", "sad": "😢", "angry": "😠", "scared": "😨", "tired": "😴",
    "hungry": "🍽️", "thirsty": "🥤",
    "nice": "😊", "beautiful": "🌸", "pretty": "💐", "cute": "🥰",
    "funny": "🤣", "fast": "⚡", "slow": "🐢",
    "easy": "👌", "hard": "💪", "many": "🔢", "much": "🔢", "little": "🤏",
    "full": "🍽️", "empty": "🫙", "heavy": "🏋️", "light": "🪶",
    "soft": "🧸", "smooth": "✨", "rough": "🪨",
    "wet": "💦", "dry": "🏜️", "sweet": "🍬", "sour": "🍋", "salty": "🧂",
    "bitter": "☕", "delicious": "😋", "yummy": "😋", "yucky": "🤢",
    "kind": "🤗", "friendly": "🤝", "shy": "😳",
    "brave": "🦸", "strong": "💪", "weak": "🤕", "sick": "🤒", "well": "💪",
    "same": "🔁", "different": "🔀", "right": "✅", "wrong": "❌",
    "open_adj": "🚪", "closed": "🚫", "alive": "🌱", "dead": "🍂",
    "asleep": "😴", "awake": "⏰", "early": "🌅", "late": "🌙",
    "busy": "🏃", "ugly": "👹", "bright": "☀️", "clever": "🧠",
    "safe": "🛡️", "poor": "💸", "rich": "💰", "free": "🆓",
    "high": "🏔️", "low": "⬇️",

    # ---- 常见名词 Nouns ----
    "home": "🏠", "house": "🏡", "room": "🚪", "door": "🚪", "window": "🪟",
    "table": "🪑", "bed": "🛏️", "sofa": "🛋️", "tv": "📺", "phone": "📱",
    "computer": "💻", "fridge": "🧊", "bedroom": "🛏️", "kitchen": "🍳",
    "bathroom": "🚿", "living room": "🛋️", "garden": "🌻", "park": "🌳",
    "zoo": "🦁", "store": "🏪", "shop": "🛍️", "hospital": "🏥",
    "library": "📚", "museum": "🏛️", "restaurant": "🍽️", "farm": "🌾",
    "street": "🛣️", "road": "🛤️", "bridge": "🌉", "car": "🚗", "bus": "🚌",
    "train": "🚆", "plane": "✈️", "ship": "🚢", "boat": "⛵", "taxi": "🚕",
    "toy": "🧸", "doll": "🪆", "balloon": "🎈", "kite": "🪁", "music": "🎵",
    "song": "🎶", "story": "📖", "puzzle": "🧩", "picture": "🖼️",
    "photo": "📷", "movie": "🎬", "fire": "🔥", "air": "💨",
    "money": "💰", "coin": "🪙", "key": "🔑", "name": "🏷️", "word": "📝",
    "letter": "✉️", "number": "🔢", "color": "🎨", "shape": "🔷",
    "line": "➖", "circle": "⭕", "square": "⬛", "triangle": "🔺",
    "people": "👥", "family": "👨‍👩‍👧", "kid": "🧒", "child": "🧒",
    "boy": "👦", "girl": "👧", "man": "👨", "woman": "👩",
    "doctor": "👨‍⚕️", "police": "👮", "farmer": "👨‍🌾",
    "driver": "🚗", "cook_noun": "👨‍🍳", "worker": "👷", "singer": "🎤",
    "dancer": "💃", "artist": "🎨", "writer": "✍️",
    "red light": "🔴", "green light": "🟢", "yellow light": "🟡",
    "this": "👉", "that": "👉", "these": "👉", "those": "👉",
    "it": "✨", "they": "👥", "we": "👥", "you": "👉",
    "he": "👨", "she": "👩", "him": "👨", "her": "👩", "his": "👨",
    "its": "✨", "their": "👥", "our": "👥", "your": "👉", "my": "👉",
    "mine": "👉", "yours": "👉", "theirs": "👥", "ours": "👥",
    "and": "➕", "but": "⚠️", "or": "🔀", "because": "💡", "so": "➡️",
    "if": "🤔", "then": "➡️", "with": "🤝", "for": "🎯", "to": "➡️",
    "from": "📤", "in_prep": "📥", "on_prep": "🔝", "at": "📍", "by": "📏",
    "about": "💭", "over": "⬆️", "under_prep": "⬇️", "after": "➡️",
    "before": "⬅️", "a": "✨", "an": "✨", "the": "✨",
    "wall": "🧱", "floor": "🪵", "box": "📦", "city": "🏙️", "village": "🏘️",
    "factory": "🏭", "tower": "🗼", "flag": "🚩", "map": "🗺️",
    "livingroom": "🛋️",
}

# Generate mapping
result = {}
missing = []
for w in words:
    en = w['en']
    emoji = EMOJI.get(en)
    if emoji:
        result[en] = emoji
    else:
        missing.append(w)
        result[en] = None  # will fall back to theme emoji

print(f"Words with emoji: {sum(1 for v in result.values() if v)}")
print(f"Words without emoji (using theme default): {len(missing)}")
if missing:
    print("\nMissing words (using theme emoji):")
    for w in missing:
        print(f"  [{w['theme']}] {w['en']} ({w['zh']})")

# Save
out_path = ROOT / 'src' / 'data' / 'word-emojis.json'
out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"\nSaved emoji mapping to {out_path}")
