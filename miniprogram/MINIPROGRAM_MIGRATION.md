# 幼升小游戏合集 - 微信小程序迁移文档

## 1. 架构概览

### 1.1 项目结构

```
项目根目录
├── src/                          # Web 版（React + Vite，保持不变）
│   └── platform/                 # 平台抽象层（Web/小程序共享）
│       ├── index.ts              # 平台检测（isMiniProgram / isWeb）
│       ├── storage.ts            # 存储抽象（localStorage ↔ wx.storage）
│       ├── tts.ts                # TTS 抽象（Web Speech ↔ 同声传译）
│       ├── audio.ts              # 音频抽象（Web Audio ↔ wx.WebAudio）
│       ├── pointer.ts            # 指针事件抽象
│       └── wx.d.ts               # wx 全局类型声明
│
└── miniprogram/                  # 小程序版（Taro 3 + React）
    ├── package.json              # Taro 3 依赖
    ├── tsconfig.json
    ├── babel.config.js
    ├── project.config.json       # 微信开发者工具配置
    ├── config/
    │   ├── index.ts              # Taro 构建配置
    │   ├── dev.ts
    │   └── prod.ts
    ├── tailwind.config.js        # 复用 Web 版 Tailwind 配置
    ├── postcss.config.js
    └── src/
        ├── app.ts                # 应用入口
        ├── app.config.ts         # 路由 + 分包 + 插件配置
        ├── app.css               # 全局样式
        ├── platform/             # 平台抽象层（从 src/platform 复制）
        └── pages/
            ├── index/            # 主页
            ├── module/           # 模块页
            └── game/             # 游戏页
```

### 1.2 一套代码两端运行的核心机制

```
┌─────────────────────────────────────────────┐
│             业务代码（28 个游戏 + 16 个组件）            │
│         只依赖 platform 抽象层接口，不直接调用浏览器 API         │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│  Web 实现      │   │  小程序实现     │
│  (Vite 构建)   │   │  (Taro 构建)   │
│               │   │               │
│  localStorage │   │  wx.storage   │
│  Web Speech    │   │  WechatSI    │
│  Web Audio     │   │  wx.WebAudio │
│  PointerEvent  │   │  touch event │
└───────────────┘   └───────────────┘
```

**核心原则**：业务代码（游戏组件）零改动，只需复制到小程序项目即可运行。

## 2. 平台抽象层说明

### 2.1 存储抽象（storage.ts）

| 方法 | Web 实现 | 小程序实现 |
|------|---------|-----------|
| `getItem(key)` | `localStorage.getItem(key)` | `wx.getStorageSync(key)` |
| `setItem(key, value)` | `localStorage.setItem(key, value)` | `wx.setStorageSync(key, value)` |
| `removeItem(key)` | `localStorage.removeItem(key)` | `wx.removeStorageSync(key)` |

调用方式：`import { storage } from '../platform'`

### 2.2 TTS 抽象（tts.ts）

| 特性 | Web 实现 | 小程序实现 |
|------|---------|-----------|
| 后端 | `window.speechSynthesis` | 微信同声传译插件 `WechatSI` |
| 中文 | `lang: 'zh-CN'` | `lang: 'zh_CN'`（自动转换） |
| 英文 | `lang: 'en-US'` | `lang: 'en_US'`（自动转换） |
| 播放 | 直接合成播放 | 云端合成 → 临时文件 → `InnerAudioContext` |
| 费用 | 免费 | 免费（微信智聆团队提供） |
| 后端依赖 | 无 | 无 |

调用方式：`import { createTtsBackend } from '../platform/tts'`

### 2.3 音频抽象（audio.ts）

| 特性 | Web 实现 | 小程序实现 |
|------|---------|-----------|
| 工厂 | `new AudioContext()` | `wx.createWebAudioContext()` |
| 兼容 | 含 `webkitAudioContext` 回退 | 基础库 2.19+ |
| API | OscillatorNode / GainNode | 完全对齐 |

调用方式：`import { createAudioContext } from '../platform/audio'`

## 3. 小程序项目初始化

### 3.1 安装依赖

```bash
cd miniprogram
npm install
```

### 3.2 开发模式（实时编译）

```bash
npm run dev:weapp
```

然后用微信开发者工具打开 `miniprogram/dist/` 目录。

### 3.3 生产构建

```bash
npm run build:weapp
```

## 4. 微信小程序后台配置

### 4.1 添加同声传译插件

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 设置 → 第三方设置 → 插件管理
3. 搜索「微信同声传译」并添加
4. 插件 AppID：`wx069ba97219f66d99`
5. 已在 `app.config.ts` 中配置：

```typescript
plugins: {
  WechatSI: {
    version: '0.3.7',
    provider: 'wx069ba97219f66d99',
  },
},
```

### 4.2 服务器域名配置（图片云存储）

504 张图片（84.9MB）无法打包进小程序，需上传到云存储：

**方案 A：微信云开发（推荐）**
1. 开通云开发（在开发者工具中）
2. 上传图片到云存储
3. 代码中用 `cloud://env-id.xxxx/images/words/cat.png` 替换本地路径

**方案 B：OSS / CDN**
1. 上传到阿里云 OSS / 腾讯云 COS
2. 配置 downloadFile 合法域名
3. 代码中用 HTTPS URL 替换

### 4.3 修改 word-images.json

将本地路径改为云端 URL：

```json
{
  "cat": "https://your-cdn.com/images/words/cat.png",
  "dog": "https://your-cdn.com/images/words/dog.png"
}
```

## 5. 游戏迁移清单

### 5.1 迁移模板（每个游戏通用）

对每个游戏组件（如 `MakeTenGame.tsx`），执行以下步骤：

1. **复制文件**：从 `src/games/<module>/<game>/` 复制到 `miniprogram/src/games/<module>/<game>/`
2. **复制逻辑层**：`*Logic.ts`、`engine.ts` 等纯函数文件直接复制，零改动
3. **复制数据文件**：`*.json` 直接复制
4. **组件改造**：
   - `<div>` → `<View>`
   - `<button>` → `<View bindtap={...}>`
   - `<span>` → `<Text>`
   - `<img>` → `<Image>`
   - `onPointerDown` → `onTouchStart`
   - `useNavigate()` → `Taro.navigateTo()`
   - 保留所有 `className`（Tailwind class）
5. **验证**：在开发者工具中运行

### 5.2 28 个游戏迁移优先级

| 优先级 | 模块 | 游戏 | 难度 | 说明 |
|--------|------|------|------|------|
| P0 | pinyin | PinyinMatch | 低 | 纯点击，无拖拽 |
| P0 | pinyin | ListenPick | 低 | TTS 核心验证 |
| P0 | pinyin | PinyinVariants | 低 | 纯点击 |
| P0 | hanzi | FlipMemory | 低 | 翻牌记忆 |
| P0 | hanzi | ConnectMatch | 低 | 连线匹配 |
| P0 | hanzi | MoreHanzi | 低 | 更多汉字 |
| P1 | math | MakeTen | 低 | 凑十法 |
| P1 | math | Multiplication | 低 | 乘法表 |
| P1 | math | SpeedDrill | 低 | 速算 |
| P1 | math | PlusMinusLink | 低 | 加减连线 |
| P1 | math | WordProblem | 低 | 应用题 |
| P1 | english | LetterCase | 低 | 大小写 |
| P1 | english | WordImage | 中 | 需云图片 |
| P1 | english | SentenceFill | 低 | 填空 |
| P1 | english | VocabDrill | 低 | 词汇 |
| P1 | english | CategoryLearn | 中 | 需云图片 |
| P1 | english | BattleQuiz | 低 | 对战问答 |
| P1 | hanzi | Match3 | 中 | 消消乐 |
| P1 | hanzi | BrickMatch | 中 | 砖块匹配 |
| P1 | hanzi | GooseCatch | 中 | 抓鸭子 |
| P2 | math | NumberMerge | 高 | 2048 拖拽 |
| P2 | math | Sudoku | 中 | 数独 |
| P2 | math | LetterSudoku | 中 | 字母数独 |
| P2 | math | ArithmeticSudoku | 中 | 算术数独 |
| P2 | math | NumberMines | 中 | 数字扫雷 |
| P2 | math | Klotski | 高 | 华容道拖拽 |
| P2 | poetry | PoetryGame | 中 | 古诗文 |
| P2 | geometry | GeometryGame | 高 | 7 种玩法 |

### 5.3 公共组件迁移

16 个公共组件迁移清单：

| 组件 | 改动量 | 说明 |
|------|--------|------|
| Button | 低 | `<button>` → `<View bindtap>` + 保留 ripple |
| Card | 低 | `<div>` → `<View>` |
| CardGrid | 低 | 同上 |
| GameShell | 低 | 移除 `useNavigate`，用 `Taro.navigateTo` |
| HUD | 低 | `<div>` → `<View>` |
| Modal | 低 | `<div>` → `<View>` |
| GridBoard | 低 | 同上 |
| ProgressBar | 低 | 同上 |
| StarRating | 低 | 同上 |
| Slider | 中 | `useDrag` → `onTouchStart/Move/End` |
| Spinner | 低 | `<div>` → `<View>` |
| Skeleton | 低 | 同上 |
| Reveal | 低 | 同上 |
| PageTransition | 低 | 移除（小程序原生动画） |
| ErrorBoundary | 低 | 直接复用 |
| Brick | 低 | `<div>` → `<View>` |

## 6. 关键改造点详解

### 6.1 HTML 标签替换

| Web | 小程序 | 说明 |
|-----|--------|------|
| `<div>` | `<View>` | 容器 |
| `<span>` / `<p>` | `<Text>` | 文本必须用 Text |
| `<button>` | `<View bindtap>` | 按钮 |
| `<img>` | `<Image>` | 图片 |
| `<input>` | `<Input>` | 输入框 |
| `<a>` | `<Navigator>` | 导航 |

### 6.2 事件替换

```typescript
// Web 版
<button onClick={handleClick} onPointerDown={ripple}>...</button>

// 小程序版
<View bindtap={handleClick} onTouchStart={ripple}>...</View>
```

### 6.3 路由替换

```typescript
// Web 版（react-router-dom）
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/math/make-ten');

// 小程序版（Taro）
import Taro from '@tarojs/taro';
Taro.navigateTo({ url: '/pages/game/index?module=math&gameId=make-ten' });
```

### 6.4 CSS 动画

Tailwind 自定义动画（pop/shake/fadeIn 等）需在小程序中验证：

- WXSS 支持 `@keyframes` 和 `animation`
- `taro-tailwind` 会将 Tailwind class 编译为 WXSS
- 部分伪类（`:focus-visible`）在小程序中无效，可移除

## 7. 已完成的工作

### 7.1 平台抽象层（✅ 完成）

- `src/platform/index.ts` — 平台检测
- `src/platform/storage.ts` — 存储抽象
- `src/platform/tts.ts` — TTS 抽象（含微信同声传译实现）
- `src/platform/audio.ts` — 音频抽象
- `src/platform/pointer.ts` — 指针事件抽象
- `src/platform/wx.d.ts` — wx 全局类型声明

### 7.2 现有代码重构（✅ 完成）

- `SoundManager.ts` — 使用 `createAudioContext()`
- `TtsManager.ts` — 使用 `TtsBackend` 代理
- `ProgressStore.ts` — 使用 `storage` 抽象
- `ttsLang.ts` — 使用 `storage` 抽象
- `sudoku/progress.ts` — 使用 `storage` 抽象
- `motion.ts` — `document.createElement` 加平台检测

### 7.3 小程序脚手架（✅ 完成）

- Taro 3 + React 项目结构
- 3 个示例页面（index/module/game）
- 同声传译插件配置
- 6 大模块分包配置
- Tailwind 配置复用
- platform 抽象层复制

## 8. 后续工作清单

### 8.1 立即可做（1-2 天）

- [ ] `npm install` 安装依赖
- [ ] 微信开发者工具打开验证脚手架
- [ ] 验证 TTS 朗读功能
- [ ] 验证 storage 读写
- [ ] 上传 504 张图片到云存储
- [ ] 更新 `word-images.json` 为云端 URL

### 8.2 短期（1-2 周）

- [ ] 迁移 16 个公共组件
- [ ] 迁移 P0 优先级游戏（6 个）
- [ ] 验证 Tailwind 自定义阴影/动画在小程序的兼容性

### 8.3 中期（3-4 周）

- [ ] 迁移 P1 优先级游戏（13 个）
- [ ] 处理图片云存储切换
- [ ] 优化分包加载性能

### 8.4 长期（5-6 周）

- [ ] 迁移 P2 优先级游戏（9 个，含拖拽类）
- [ ] 真机测试所有游戏
- [ ] 小程序审核发布

## 9. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Tailwind 多层阴影不兼容 | 视觉降级 | 提前验证，必要时简化为单层阴影 |
| 拖拽游戏（Klotski/NumberMerge） | 交互复杂 | 最后迁移，用 `onTouchMove` 重写 |
| 图片加载慢 | 用户体验 | 预加载 + 占位图 + CDN |
| 同声传译插件审核 | 需提前申请 | 提交审核前确认插件已添加 |
| 主包超 2MB | 构建失败 | 分包配置已就绪 |

## 10. 参考资料

- [Taro 3 文档](https://docs.taro.zone/)
- [微信同声传译插件](https://mp.weixin.qq.com/wxopen/pluginbasicprofile?action=intro&appid=wx069ba97219f66d99)
- [小程序分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)
- [Tailwind CSS 小程序适配](https://weapp-tw.icebreaker.top/)
