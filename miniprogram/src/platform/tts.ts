/**
 * TTS 抽象层 —— 统一 Web Speech API 与预生成音频方案。
 *
 * Web 端：window.speechSynthesis（离线、即时合成播放任意文本）
 * 小程序端：预生成 MP3 音频 + 三级缓存（内存 → 本地文件 → 云存储）
 *
 * 小程序端方案说明：
 *   放弃 WechatSI 插件（受类目/主体限制），改用预生成音频方案。
 *   1. 开发阶段用 scripts/genWordAudios.mjs 批量生成单词 MP3
 *   2. 上传到微信云存储 audio/words/
 *   3. 小程序运行时通过 wx.cloud.downloadFile(fileID) 按需下载并缓存到本地
 *      （wx.cloud 自动签发临时凭证，无需文件公开读权限，规避 403）
 *   4. 播放时优先从缓存读取，避免重复下载
 *
 * 三级缓存查找顺序：
 *   L1 内存缓存 → L2 本地文件 → L3 云存储下载
 *
 * 限制：小程序端仅支持预生成音频的文本（如英语单词），未预生成的文本静默跳过。
 */

import wordAudios from '../data/word-audios.json';
import { CLOUD_FILE_ID_PREFIX } from '../cloud-config';

export interface TtsBackend {
  /** 朗读文本 */
  speak(
    text: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
  ): void;
  /** 立即停止当前朗读 */
  stop(): void;
  /** 释放资源 */
  dispose(): void;
  /** 预加载音色（Web 端有意义，小程序端 no-op） */
  loadVoices?(): void;
}

// ---------------------------------------------------------------------------
// Web 实现：基于 Web Speech API
// ---------------------------------------------------------------------------

export class WebTtsBackend implements TtsBackend {
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  private pickVoice(lang?: string): SpeechSynthesisVoice | null {
    if (!lang || this.voices.length === 0) return null;
    const key = lang.toLowerCase();
    const findByPrefix = (prefix: string): SpeechSynthesisVoice | null =>
      this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;

    if (key.startsWith('zh-hk') || key.startsWith('zh-yue')) {
      return findByPrefix('zh-hk') ?? findByPrefix('zh-yue');
    }
    if (key.startsWith('en')) {
      return findByPrefix('en-us') ?? findByPrefix('en-gb') ?? findByPrefix('en') ?? this.voices[0] ?? null;
    }
    if (key.startsWith('zh')) {
      return findByPrefix('zh-cn') ?? findByPrefix('zh') ?? this.voices[0] ?? null;
    }
    return this.voices[0] ?? null;
  }

  speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void }): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      opts?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts?.lang ?? 'zh-CN';
    u.rate = opts?.rate ?? 0.9;
    const v = this.pickVoice(opts?.lang);
    if (v) u.voice = v;
    if (opts?.onEnd) u.onend = () => opts.onEnd!();
    window.speechSynthesis.speak(u);
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  dispose(): void {
    this.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = null;
    }
  }
}

// ---------------------------------------------------------------------------
// 小程序实现：预生成音频 + 三级缓存（内存 → 本地文件 → 云存储）
// ---------------------------------------------------------------------------

/** 音频映射表：word → 音频相对路径（如 "one" → "/audio/words/one.mp3"），仅用于判断是否有预生成音频 */
const audioMap = wordAudios as Record<string, string>;

/**
 * 大小写不敏感的查找表：lowercasedWord → 云存储相对路径（保留 json 中的原始文件名大小写）。
 * 云存储路径区分大小写（如 Monday.mp3 ≠ monday.mp3），必须用 json 记录的真实文件名拼接 fileID，
 * 因此这里以小写 key 索引，但值保留原始大小写。
 */
const audioRelByWord: Record<string, string> = {};
for (const [w, rel] of Object.entries(audioMap)) {
  audioRelByWord[w.toLowerCase().trim()] = rel as string;
}

class WxTtsBackend implements TtsBackend {
  /** L1 内存缓存：word → 本地文件路径（已下载并解析） */
  private pathCache = new Map<string, string>();
  /** 当前播放的音频上下文 */
  private currentAudio: {
    stop?: () => void;
    destroy?: () => void;
  } | null = null;
  /** 正在下载中的任务（避免重复下载同一个文件） */
  private pendingDownloads = new Map<string, Set<(path: string | null) => void>>();

  speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void }): void {
    if (!text) {
      opts?.onEnd?.();
      return;
    }

    // 停止上一个播放
    this.stop();

    // 查找音频映射（大小写不敏感），保留 json 中的原始文件名大小写
    const key = text.toLowerCase().trim();
    const rel = audioRelByWord[key];
    if (!rel) {
      // 未预生成的文本：静默跳过（小程序端无法实时 TTS）
      opts?.onEnd?.();
      return;
    }

    // L1 内存缓存
    const cachedPath = this.pathCache.get(key);
    if (cachedPath) {
      this.playAudio(cachedPath, opts);
      return;
    }

    // L2 本地文件检查 + L3 云存储下载
    const localPath = this.getLocalPath(key);
    this.tryLocalOrDownload(key, rel, localPath, opts);
  }

  /** 获取单词的本地缓存路径 */
  private getLocalPath(word: string): string {
    return `${wx.env.USER_DATA_PATH}/audio/${word}.mp3`;
  }

  /** 检查本地文件是否存在，不存在则从云存储下载 */
  private tryLocalOrDownload(
    word: string,
    rel: string,
    localPath: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
  ): void {
    try {
      const fs = wx.getFileSystemManager();
      // 确保目录存在
      const dir = `${wx.env.USER_DATA_PATH}/audio`;
      try {
        fs.mkdirSync(dir, true);
      } catch {
        // 目录可能已存在，忽略
      }
      // 检查文件是否存在
      fs.accessSync(localPath);
      // 文件存在 → 缓存并播放
      this.pathCache.set(word, localPath);
      this.playAudio(localPath, opts);
      return;
    } catch {
      // 文件不存在，继续下载
    }

    // L3 云存储下载
    this.downloadFromCloud(word, rel, localPath, opts);
  }

  /** 从云存储下载音频到本地（使用 wx.cloud.downloadFile + cloud:// 文件 ID，自动签名） */
  private downloadFromCloud(
    word: string,
    rel: string,
    localPath: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
  ): void {
    // 检查是否已有相同下载在进行中
    const pending = this.pendingDownloads.get(word);
    if (pending) {
      pending.add((path) => {
        if (path) {
          this.playAudio(path, opts);
        } else {
          opts?.onEnd?.();
        }
      });
      return;
    }

    // 云开发不可用（未 init）时直接跳过
    if (typeof wx === 'undefined' || typeof wx.cloud?.downloadFile !== 'function') {
      opts?.onEnd?.();
      return;
    }

    // 创建新的下载任务
    const callbacks = new Set<(path: string | null) => void>();
    this.pendingDownloads.set(word, callbacks);

    // rel 形如 "/audio/words/Monday.mp3"，保留原始大小写拼接 cloud 文件 ID
    const fileID = `${CLOUD_FILE_ID_PREFIX}${rel.replace(/^\//, '')}`;
    wx.cloud.downloadFile({
      fileID,
      filePath: localPath,
      success: (res) => {
        if (res.statusCode === 200) {
          // 下载成功 → 缓存并播放
          this.pathCache.set(word, localPath);
          this.notifyPending(word, localPath);
          this.playAudio(localPath, opts);
        } else {
          this.notifyPending(word, null);
          opts?.onEnd?.();
        }
      },
      fail: () => {
        this.notifyPending(word, null);
        opts?.onEnd?.();
      },
    });
  }

  /** 通知所有等待该 word 下载的回调 */
  private notifyPending(word: string, path: string | null): void {
    const callbacks = this.pendingDownloads.get(word);
    if (callbacks) {
      callbacks.forEach((cb) => cb(path));
      this.pendingDownloads.delete(word);
    }
  }

  /** 播放本地音频文件 */
  private playAudio(
    path: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
  ): void {
    // 路径无效时直接结束，避免底层 AudioContext 解码报错
    if (!path) {
      opts?.onEnd?.();
      return;
    }
    try {
      const audio = wx.createInnerAudioContext();
      audio.src = path;
      audio.onEnded(() => {
        opts?.onEnd?.();
        audio.destroy();
        this.currentAudio = null;
      });
      audio.onError(() => {
        // 解码失败（如文件损坏/为空）时静默结束，不影响主流程
        opts?.onEnd?.();
        audio.destroy();
        this.currentAudio = null;
      });
      this.currentAudio = audio;
      audio.play();
    } catch {
      opts?.onEnd?.();
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.stop?.();
      this.currentAudio.destroy?.();
      this.currentAudio = null;
    }
  }

  dispose(): void {
    this.stop();
    this.pathCache.clear();
    this.pendingDownloads.clear();
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

export function createTtsBackend(): TtsBackend {
  if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
    return new WxTtsBackend();
  }
  return new WebTtsBackend();
}
