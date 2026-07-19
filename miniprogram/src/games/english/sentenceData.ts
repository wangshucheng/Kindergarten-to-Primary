// 本文件由 scripts/genVocab.mjs 自动生成，请勿手改。
// 数据源：content/sentence-patterns.md（核心句型）

export interface SentencePattern {
  type: string;
  formula: string;
  examples: { en: string; zh: string }[];
}

export const SENTENCES: SentencePattern[] = [
  {
    type: "问候",
    formula: "Hello / Hi + 称呼. ｜ Good morning / afternoon / evening.",
    examples: [
      { en: "Hello, Mike!", zh: "你好，迈克！" },
      { en: "Good morning, teacher", zh: "早上好，老师。" },
      { en: "Hi! How are you?", zh: "嗨！你好吗？" },
      { en: "I'm fine, thank you", zh: "我很好，谢谢。" },
    ],
  },
  {
    type: "问答",
    formula: "问：Be/Can + 主语 + …? 答：Yes, 主语 + be/can. / No, 主语 + be/can + not.",
    examples: [
      { en: "Are you a student?", zh: "你是学生吗？" },
      { en: "Yes, I am", zh: "是的，我是。" },
      { en: "Can you swim?", zh: "你会游泳吗？" },
      { en: "No, I can't", zh: "不，我不会。" },
      { en: "Is this a book?", zh: "这是一本书吗？" },
      { en: "Yes, it is", zh: "是的。" },
    ],
  },
  {
    type: "描述",
    formula: "主语 + be (am/is/are) + 特征/颜色/名词.",
    examples: [
      { en: "I am tall", zh: "我很高。" },
      { en: "The apple is red", zh: "苹果是红色的。" },
      { en: "They are happy", zh: "他们很开心。" },
    ],
  },
  {
    type: "一般疑问句",
    formula: "Do/Does + 主语 + 动词原形 + …?",
    examples: [
      { en: "Do you like apples?", zh: "你喜欢苹果吗？" },
      { en: "Yes, I do", zh: "是的，我喜欢。" },
      { en: "Does she have a cat?", zh: "她有一只猫吗？" },
      { en: "No, she doesn't", zh: "不，她没有。" },
    ],
  },
  {
    type: "特殊疑问句",
    formula: "疑问词(What/Who/Where/How many) + 助动词/be + 主语 + …?",
    examples: [
      { en: "What is your name?", zh: "你叫什么名字？" },
      { en: "My name is Tom", zh: "我叫汤姆。" },
      { en: "Where is the book?", zh: "书在哪里？" },
      { en: "It is on the desk", zh: "在桌子上。" },
      { en: "How many dogs?", zh: "多少只狗？" },
      { en: "Three dogs", zh: "三只。" },
    ],
  },
  {
    type: "存在句",
    formula: "There is + 单数名词. ｜ There are + 复数名词.",
    examples: [
      { en: "There is a book on the table", zh: "桌上有一本书。" },
      { en: "There are two cats in the box", zh: "盒子里有两只猫。" },
      { en: "There is some water", zh: "有一些水。" },
    ],
  },
  {
    type: "进行时",
    formula: "主语 + be (am/is/are) + 动词-ing + …",
    examples: [
      { en: "I am reading", zh: "我正在读书。" },
      { en: "He is running", zh: "他正在跑步。" },
      { en: "They are singing", zh: "他们正在唱歌。" },
    ],
  },
  {
    type: "能力",
    formula: "主语 + can + 动词原形 + …",
    examples: [
      { en: "I can draw", zh: "我会画画。" },
      { en: "She can dance", zh: "她会跳舞。" },
      { en: "We can help you", zh: "我们能帮你。" },
    ],
  },
  {
    type: "第三人称单数",
    formula: "主语是 he/she/it 时，一般现在时动词加 s 或 es。",
    examples: [
      { en: "He **likes** apples", zh: "他喜欢苹果。" },
      { en: "She **goes** to school", zh: "她去上学。" },
      { en: "It **has** a long tail", zh: "它有一条长尾巴。" },
    ],
  },
  {
    type: "祈使句",
    formula: "动词原形 + 其他. ｜ Please + 动词原形.",
    examples: [
      { en: "Open the book", zh: "打开书。" },
      { en: "Please sit down", zh: "请坐下。" },
      { en: "Listen to me", zh: "听我说。" },
    ],
  },
  {
    type: "感谢与道歉",
    formula: "Thank you (very much). ｜ Sorry. / I'm sorry.",
    examples: [
      { en: "Thank you for your help", zh: "谢谢你的帮助。" },
      { en: "I'm sorry", zh: "对不起。" },
      { en: "Excuse me", zh: "打扰一下 / 借过。" },
    ],
  },
];
