/**
 * TTS 抽象层 —— 统一 Web Speech API 与小程序预生成音频 + 云函数兜底方案。
 *
 * Web 端：window.speechSynthesis（离线、即时合成播放任意文本）
 *
 * 小程序端（方案详见 docs/tts-miniprogram-research.md）：
 *   1. 预生成为主：英文单词（504 个）与中文语料（古诗/汉字/拼音/题干/引导语）
 *      在构建期批量合成 MP3 上传云存储，映射表见 data/word-audios.json 与
 *      data/zh-audios.json（中文映射由 scripts/genZhAudios.mjs 生成）。
 *   2. 云函数兜底：中文文本未命中映射时，先按命名契约推定云端路径直接下载
 *      （/audio/zh/<sha1("zh-CN|"+text)>.mp3，可能已被其他设备合成过）；
 *      下载失败再调云函数 tts 在线合成、上传后下载播放。
 *   3. 三级缓存：L1 内存 → L2 本地文件（USER_DATA_PATH）→ L3 云存储/云函数。
 *
 * 限制：未预生成的英文文本仍静默跳过（英文兜底未启用）；中文兜底依赖
 * 云函数已部署且配置了腾讯云密钥，未部署时行为与之前一致（静默跳过）。
 */

import wordAudios from '../data/word-audios.json';
import zhAudios from '../data/zh-audios.json';
import zhPoetryAudios from '../data/zh-poetry-audios.json';
import { buildAudioFileId } from '../cloud-config';
import { fetchViaCloudProxy } from './cloudFile';
import { lookupMappedAudio, zhAudioPath, type AudioMap, type TtsCategory } from './ttsText';

export interface TtsBackend {
  /** 朗读文本 */
  speak(
    text: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void; category?: TtsCategory },
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
// 小程序实现：预生成音频（中/英映射表）+ 云函数在线合成兜底 + 三级缓存
// ---------------------------------------------------------------------------

/** 英文单词音频映射：word → "/audio/words/xxx.mp3" */
const enAudioMap = wordAudios as AudioMap;
/** 中文音频映射：文本 → "/audio/zh/<hash>.mp3"（genZhAudios.mjs 生成） */
const zhAudioMap = zhAudios as AudioMap;
/** 古诗情感版映射：文本 → "/audio/zh/<hash>.mp3"（与 zhAudioMap 文件名带 |poetry 盐，物理不同） */
const zhPoetryAudioMap = zhPoetryAudios as AudioMap;

class WxTtsBackend implements TtsBackend {
  /** L1 内存缓存：规范化文本键 → 本地文件路径（已下载） */
  private pathCache = new Map<string, string>();
  /** 当前播放的音频上下文 */
  private currentAudio: {
    stop?: () => void;
    destroy?: () => void;
  } | null = null;
  /** 正在下载/合成中的任务（同一文本键只保留一个在途流程） */
  private pendingDownloads = new Map<string, Set<(path: string | null) => void>>();

  speak(
    text: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void; category?: TtsCategory },
  ): void {
    const key = (text ?? '').trim();
    if (!key) {
      opts?.onEnd?.();
      return;
    }
    const category = opts?.category ?? 'general';

    // 停止上一个播放
    this.stop();

    const mapped = lookupMappedAudio(
      key,
      { en: enAudioMap, zh: zhAudioMap, zhPoetry: zhPoetryAudioMap },
      category,
    );
    if (mapped) {
      // 命中预生成映射：L1 → L2 → L3 云存储下载；中文允许云函数自愈补合成
      this.playFromCacheOrResolve(key, mapped.path, opts, mapped.kind === 'zh', category);
      return;
    }

    // 未命中映射：中文文本按命名契约推定路径，走「下载 → 云函数合成」兜底
    const lang = opts?.lang ?? 'zh-CN';
    if (!lang.toLowerCase().startsWith('zh')) {
      // 未预生成的英文文本：维持原有静默跳过行为
      opts?.onEnd?.();
      return;
    }
    this.playFromCacheOrResolve(key, zhAudioPath(key, category), opts, true, category);
  }

  /**
   * 按云端相对路径解析音频并播放：L1 内存 → L2 本地文件 → L3 远端
   * （先按推定 fileID 直接下载，失败且允许时转云函数在线合成）。
   * @param key 规范化文本键（缓存与去重的键）
   * @param relPath 云端相对路径（"/audio/..."），同时用作本地相对路径
   * @param allowSynthesize 远端下载失败时是否允许调云函数在线合成
   */
  private playFromCacheOrResolve(
    key: string,
    relPath: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
    allowSynthesize: boolean,
    category: TtsCategory = 'general',
  ): void {
    // L1 内存缓存
    const cachedPath = this.pathCache.get(key);
    if (cachedPath) {
      this.playAudio(cachedPath, opts);
      return;
    }

    // L2 本地文件检查
    const localPath = `${wx.env.USER_DATA_PATH}${relPath}`;
    try {
      const fs = wx.getFileSystemManager();
      // 确保目录存在（含 audio/words、audio/zh 等子目录）
      const dir = localPath.slice(0, localPath.lastIndexOf('/'));
      try {
        fs.mkdirSync(dir, true);
      } catch {
        // 目录可能已存在，忽略
      }
      fs.accessSync(localPath);
      // 文件存在 → 缓存并播放
      this.pathCache.set(key, localPath);
      this.playAudio(localPath, opts);
      return;
    } catch {
      // 文件不存在，继续远端解析
    }

    this.resolveRemote(key, relPath, opts, allowSynthesize, category);
  }

  /** L3 远端解析：推定 fileID 经云函数代理下载 →（可选）云函数合成 → 再取回 */
  private resolveRemote(
    key: string,
    relPath: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
    allowSynthesize: boolean,
    category: TtsCategory = 'general',
  ): void {
    // 同一文本键已有在途流程 → 挂到同一回调集，避免重复下载/合成
    const pending = this.pendingDownloads.get(key);
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

    const callbacks = new Set<(path: string | null) => void>();
    this.pendingDownloads.set(key, callbacks);

    const finish = (path: string | null): void => {
      this.notifyPending(key, path);
      if (path) {
        this.playAudio(path, opts);
      } else {
        opts?.onEnd?.();
      }
    };

    // 文件下载：经 cloudProxy 云函数（服务端管理员身份）读取并写入本地缓存。
    // 云存储读安全规则不可改，小程序访客直连必被 -403003 拦截，故不再尝试直连。
    const downloadViaProxy = (fileID: string, onFinalFail: () => void): void => {
      fetchViaCloudProxy(fileID).then((proxyPath) => {
        if (proxyPath) {
          this.pathCache.set(key, proxyPath);
          finish(proxyPath);
        } else {
          onFinalFail();
        }
      });
    };

    // 先按推定路径下载：命中（含其他设备已合成的文本）则无需调云函数
    downloadViaProxy(buildAudioFileId(relPath), () => {
      if (!allowSynthesize || typeof wx.cloud?.callFunction !== 'function') {
        finish(null);
        return;
      }
      // 云函数在线合成并上传到同一路径，成功后经代理重新取回
      wx.cloud.callFunction({
        name: 'tts',
        data: { text: key, lang: 'zh-CN', category },
        success: (res) => {
          const result = res.result as { ok?: boolean; fileID?: string } | undefined;
          if (result && result.ok && result.fileID) {
            downloadViaProxy(result.fileID, () => finish(null));
          } else {
            finish(null);
          }
        },
        fail: () => finish(null),
      });
    });
  }

  /** 通知所有等待该文本键的回调 */
  private notifyPending(key: string, path: string | null): void {
    const callbacks = this.pendingDownloads.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => cb(path));
      this.pendingDownloads.delete(key);
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
