export interface PoemLine {
  /** 原句 */
  text: string;
  /** 该句完整拼音（含声调，空格分隔） */
  pinyin: string;
}

export interface Poem {
  id: string;
  title: string;
  /** 作者名 */
  author: string;
  /** 朝代，如 '唐' */
  dynasty: string;
  /** 核心主题标签（来自 content/poetry-themes.md） */
  themes: string[];
  lines: PoemLine[];
  /** 儿童释义（口语化、易懂） */
  explanation: string;
}

export const poems: Poem[] = [
  {
    id: 'yong-e',
    title: '咏鹅',
    author: '骆宾王',
    dynasty: '唐',
    themes: ['咏物', '童趣'],
    lines: [
      { text: '鹅，鹅，鹅，', pinyin: 'é, é, é,' },
      { text: '曲项向天歌。', pinyin: 'qū xiàng xiàng tiān gē.' },
      { text: '白毛浮绿水，', pinyin: 'bái máo fú lǜ shuǐ,' },
      { text: '红掌拨清波。', pinyin: 'hóng zhǎng bō qīng bō.' },
    ],
    explanation:
      '小白鹅弯着脖子朝天上唱歌，白羽毛漂在绿水上，红红的脚掌划开清清的水波。',
  },
  {
    id: 'jing-ye-si',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    themes: ['思乡'],
    lines: [
      { text: '床前明月光，', pinyin: 'chuáng qián míng yuè guāng,' },
      { text: '疑是地上霜。', pinyin: 'yí shì dì shàng shuāng.' },
      { text: '举头望明月，', pinyin: 'jǔ tóu wàng míng yuè,' },
      { text: '低头思故乡。', pinyin: 'dī tóu sī gù xiāng.' },
    ],
    explanation:
      '床前洒满明亮的月光，好像地上结了一层霜。抬起头望着天上的明月，低下头想起了远方的家乡。',
  },
  {
    id: 'chun-xiao',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    themes: ['写景', '惜时'],
    lines: [
      { text: '春眠不觉晓，', pinyin: 'chūn mián bù jué xiǎo,' },
      { text: '处处闻啼鸟。', pinyin: 'chǔ chù wén tí niǎo.' },
      { text: '夜来风雨声，', pinyin: 'yè lái fēng yǔ shēng,' },
      { text: '花落知多少。', pinyin: 'huā luò zhī duō shǎo.' },
    ],
    explanation:
      '春夜睡得香，不知不觉天就亮了，到处听见小鸟在叫。昨夜刮风又下雨，不知道吹落了多少花。',
  },
  {
    id: 'deng-guan-que-lou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    themes: ['励志', '写景'],
    lines: [
      { text: '白日依山尽，', pinyin: 'bái rì yī shān jìn,' },
      { text: '黄河入海流。', pinyin: 'huáng hé rù hǎi liú.' },
      { text: '欲穷千里目，', pinyin: 'yù qióng qiān lǐ mù,' },
      { text: '更上一层楼。', pinyin: 'gèng shàng yī céng lóu.' },
    ],
    explanation:
      '太阳挨着山慢慢落下，黄河向着大海奔流。想要看到更远的地方，就要再登上一层楼——多努力，就多看更广的风景。',
  },
  {
    id: 'min-nong',
    title: '悯农（其二）',
    author: '李绅',
    dynasty: '唐',
    themes: ['爱农', '惜时'],
    lines: [
      { text: '锄禾日当午，', pinyin: 'chú hé rì dāng wǔ,' },
      { text: '汗滴禾下土。', pinyin: 'hàn dī hé xià tǔ.' },
      { text: '谁知盘中餐，', pinyin: 'shéi zhī pán zhōng cān,' },
      { text: '粒粒皆辛苦。', pinyin: 'lì lì jiē xīn kǔ.' },
    ],
    explanation:
      '农民中午顶着太阳锄草，汗珠滴进泥土里。谁知道碗里的饭，每一粒都来得不容易、都很辛苦。',
  },
  {
    id: 'gu-lang-yue-xing',
    title: '古朗月行（节选）',
    author: '李白',
    dynasty: '唐',
    themes: ['写景', '童趣'],
    lines: [
      { text: '小时不识月，', pinyin: 'xiǎo shí bù shí yuè,' },
      { text: '呼作白玉盘。', pinyin: 'hū zuò bái yù pán.' },
      { text: '又疑瑶台镜，', pinyin: 'yòu yí yáo tái jìng,' },
      { text: '飞在青云端。', pinyin: 'fēi zài qīng yún duān.' },
    ],
    explanation:
      '小时候不认识月亮，把它叫做白玉盘。又怀疑是神仙瑶台上的镜子，飞在蓝天白云的边儿上。',
  },
  {
    id: 'feng',
    title: '风',
    author: '李峤',
    dynasty: '唐',
    themes: ['咏物', '写景'],
    lines: [
      { text: '解落三秋叶，', pinyin: 'jiě luò sān qiū yè,' },
      { text: '能开二月花。', pinyin: 'néng kāi èr yuè huā.' },
      { text: '过江千尺浪，', pinyin: 'guò jiāng qiān chǐ làng,' },
      { text: '入竹万竿斜。', pinyin: 'rù zhú wàn gān xié.' },
    ],
    explanation:
      '风能把秋天的树叶吹落，能吹开二月的鲜花。吹过江面掀起千尺浪，吹进竹林万根竹子都歪斜。',
  },
  {
    id: 'chi-shang',
    title: '池上',
    author: '白居易',
    dynasty: '唐',
    themes: ['童趣'],
    lines: [
      { text: '小娃撑小艇，', pinyin: 'xiǎo wá chēng xiǎo tǐng,' },
      { text: '偷采白莲回。', pinyin: 'tōu cǎi bái lián huí.' },
      { text: '不解藏踪迹，', pinyin: 'bù jiě cáng zōng jì,' },
      { text: '浮萍一道开。', pinyin: 'fú píng yī dào kāi.' },
    ],
    explanation:
      '小孩子偷偷撑着小船，去采了白莲回来。他还不懂得藏起自己的踪迹，水面上的浮萍被小船分开，留下了一道水痕。',
  },
  {
    id: 'xiao-chi',
    title: '小池',
    author: '杨万里',
    dynasty: '宋',
    themes: ['写景', '童趣'],
    lines: [
      { text: '泉眼无声惜细流，', pinyin: 'quán yǎn wú shēng xī xì liú,' },
      { text: '树阴照水爱晴柔。', pinyin: 'shù yīn zhào shuǐ ài qíng róu.' },
      { text: '小荷才露尖尖角，', pinyin: 'xiǎo hé cái lù jiān jiān jiǎo,' },
      { text: '早有蜻蜓立上头。', pinyin: 'zǎo yǒu qīng tíng lì shàng tóu.' },
    ],
    explanation:
      '泉眼悄悄流水，舍不得细细的水流；树荫映在水里，爱这晴天柔柔的风光。小小的荷叶才露出尖尖的角，早有一只蜻蜓立在上头。',
  },
  {
    id: 'hua',
    title: '画',
    author: '王维',
    dynasty: '唐',
    themes: ['写景'],
    lines: [
      { text: '远看山有色，', pinyin: 'yuǎn kàn shān yǒu sè,' },
      { text: '近听水无声。', pinyin: 'jìn tīng shuǐ wú shēng.' },
      { text: '春去花还在，', pinyin: 'chūn qù huā hái zài,' },
      { text: '人来鸟不惊。', pinyin: 'rén lái niǎo bù jīng.' },
    ],
    explanation:
      '远远看山有颜色，走近听水却没有声音。春天过去了花还在开，人走过来小鸟也不害怕。',
  },
  {
    id: 'cun-ju',
    title: '村居',
    author: '高鼎',
    dynasty: '清',
    themes: ['写景', '童趣'],
    lines: [
      { text: '草长莺飞二月天，', pinyin: 'cǎo zhǎng yīng fēi èr yuè tiān,' },
      { text: '拂堤杨柳醉春烟。', pinyin: 'fú dī yáng liǔ zuì chūn yān.' },
      { text: '儿童散学归来早，', pinyin: 'hái tóng sàn xué guī lái zǎo,' },
      { text: '忙趁东风放纸鸢。', pinyin: 'máng chèn dōng fēng fàng zhǐ yuān.' },
    ],
    explanation:
      '草儿生长，黄莺飞舞，正是二月春天。杨柳轻拂堤岸，迷蒙在春天的烟雾里。孩子们放学回来得早，赶忙趁着东风把风筝放上天空。',
  },
  {
    id: 'yong-liu',
    title: '咏柳',
    author: '贺知章',
    dynasty: '唐',
    themes: ['咏物', '写景'],
    lines: [
      { text: '碧玉妆成一树高，', pinyin: 'bì yù zhuāng chéng yī shù gāo,' },
      { text: '万条垂下绿丝绦。', pinyin: 'wàn tiáo chuí xià lǜ sī tāo.' },
      { text: '不知细叶谁裁出，', pinyin: 'bù zhī xì yè shéi cái chū,' },
      { text: '二月春风似剪刀。', pinyin: 'èr yuè chūn fēng sì jiǎn dāo.' },
    ],
    explanation:
      '高高的柳树像用碧玉打扮成，万条柳枝垂下像绿色的丝带。不知道细细的柳叶是谁剪出来的，二月的春风就像一把剪刀。',
  },
  {
    id: 'fu-de-gu-yuan-cao',
    title: '赋得古原草送别（节选）',
    author: '白居易',
    dynasty: '唐',
    themes: ['送别', '励志'],
    lines: [
      { text: '离离原上草，', pinyin: 'lí lí yuán shàng cǎo,' },
      { text: '一岁一枯荣。', pinyin: 'yī suì yī kū róng.' },
      { text: '野火烧不尽，', pinyin: 'yě huǒ shāo bù jìn,' },
      { text: '春风吹又生。', pinyin: 'chūn fēng chuī yòu shēng.' },
    ],
    explanation:
      '原野上长满茂盛的草，一年里一度枯萎一度繁荣。野火也烧不完它，春风一吹它又生长出来。',
  },
  {
    id: 'xiao-chu-jing-ci-si',
    title: '晓出净慈寺送林子方',
    author: '杨万里',
    dynasty: '宋',
    themes: ['送别', '写景'],
    lines: [
      { text: '毕竟西湖六月中，', pinyin: 'bì jìng xī hú liù yuè zhōng,' },
      { text: '风光不与四时同。', pinyin: 'fēng guāng bù yǔ sì shí tóng.' },
      { text: '接天莲叶无穷碧，', pinyin: 'jiē tiān lián yè wú qióng bì,' },
      { text: '映日荷花别样红。', pinyin: 'yìng rì hé huā bié yàng hóng.' },
    ],
    explanation:
      '到底还是六月的西湖，风光和别的季节不一样。连天的莲叶一片无穷的碧绿，映着太阳的荷花格外红艳。',
  },
  {
    id: 'jue-ju',
    title: '绝句（两个黄鹂鸣翠柳）',
    author: '杜甫',
    dynasty: '唐',
    themes: ['写景'],
    lines: [
      { text: '两个黄鹂鸣翠柳，', pinyin: 'liǎng gè huáng lí míng cuì liǔ,' },
      { text: '一行白鹭上青天。', pinyin: 'yī háng bái lù shàng qīng tiān.' },
      { text: '窗含西岭千秋雪，', pinyin: 'chuāng hán xī lǐng qiān qiū xuě,' },
      { text: '门泊东吴万里船。', pinyin: 'mén bó dōng wú wàn lǐ chuán.' },
    ],
    explanation:
      '两只黄鹂在翠绿的柳枝上鸣叫，一行白鹭飞上蓝色的天空。窗外正对着西岭千年不化的积雪，门口停着驶向万里外东吴的船。',
  },
  {
    id: 'min-nong-1',
    title: '悯农（其一）',
    author: '李绅',
    dynasty: '唐',
    themes: ['爱农', '惜时'],
    lines: [
      { text: '春种一粒粟，', pinyin: 'chūn zhòng yī lì sù,' },
      { text: '秋收万颗子。', pinyin: 'qiū shōu wàn kē zǐ.' },
      { text: '四海无闲田，', pinyin: 'sì hǎi wú xián tián,' },
      { text: '农夫犹饿死。', pinyin: 'nóng fū yóu è sǐ.' },
    ],
    explanation:
      '春天种下一粒种子，秋天收获万颗粮食。天下没有一块闲着的田地，可农民还是饿死了。',
  },
  {
    id: 'zhou-ye-shu-suo-jian',
    title: '舟夜书所见',
    author: '查慎行',
    dynasty: '清',
    themes: ['写景'],
    lines: [
      { text: '月黑见渔灯，', pinyin: 'yuè hēi jiàn yú dēng,' },
      { text: '孤光一点萤。', pinyin: 'gū guāng yī diǎn yíng.' },
      { text: '微微风簇浪，', pinyin: 'wēi wēi fēng cù làng,' },
      { text: '散作满河星。', pinyin: 'sàn zuò mǎn hé xīng.' },
    ],
    explanation:
      '没有月亮的黑夜，看见渔船上的一点灯，孤零零的光像一只萤火虫。微风吹起层层波浪，灯光散开像洒满河面的星星。',
  },
  {
    id: 'wang-lu-shan-pu-bu',
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    themes: ['写景'],
    lines: [
      { text: '日照香炉生紫烟，', pinyin: 'rì zhào xiāng lú shēng zǐ yān,' },
      { text: '遥看瀑布挂前川。', pinyin: 'yáo kàn pù bù guà qián chuān.' },
      { text: '飞流直下三千尺，', pinyin: 'fēi liú zhí xià sān qiān chǐ,' },
      { text: '疑是银河落九天。', pinyin: 'yí shì yín hé luò jiǔ tiān.' },
    ],
    explanation:
      '阳光照在香炉峰上生出紫色的烟霞，远远看去瀑布像挂在山前的河流。水流飞泻直下三千尺，让人怀疑是银河从天上落下来。',
  },
];
