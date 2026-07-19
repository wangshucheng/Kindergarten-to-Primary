/**
 * ttsText 单测：文本键规范化、中文音频命名契约、预生成映射查找。
 */
import { createHash } from 'node:crypto';
import {
  ZH_AUDIO_DIR,
  lookupMappedAudio,
  normalizeTextKey,
  zhAudioFileName,
  zhAudioPath,
} from './ttsText';

describe('normalizeTextKey', () => {
  it('去首尾空白并折叠内部连续空白', () => {
    expect(normalizeTextKey('  床前明月光  ')).toBe('床前明月光');
    expect(normalizeTextKey('多\n  空白 \t 折叠')).toBe('多 空白 折叠');
    expect(normalizeTextKey('1 米 = ? 厘米')).toBe('1 米 = ? 厘米');
  });
});

describe('zhAudioFileName / zhAudioPath', () => {
  it('遵循 sha1("zh-CN|"+text) 命名契约（与 node:crypto 对齐）', () => {
    const text = '静夜思。李白。床前明月光，疑是地上霜。';
    const expectHash = createHash('sha1').update(`zh-CN|${text}`, 'utf8').digest('hex');
    expect(zhAudioFileName(text)).toBe(`${expectHash}.mp3`);
    expect(zhAudioPath(text)).toBe(`${ZH_AUDIO_DIR}/${expectHash}.mp3`);
  });

  it('先规范化再哈希（首尾空白不影响文件名）', () => {
    expect(zhAudioFileName('  咏鹅 ')).toBe(zhAudioFileName('咏鹅'));
  });
});

describe('lookupMappedAudio', () => {
  const maps = {
    en: { one: '/audio/words/one.mp3' },
    zh: { 床前明月光: '/audio/zh/aaa.mp3' },
  };

  it('英文映射按小写键命中', () => {
    expect(lookupMappedAudio('One', maps)).toEqual({ path: '/audio/words/one.mp3', kind: 'en' });
    expect(lookupMappedAudio(' one ', maps)).toEqual({ path: '/audio/words/one.mp3', kind: 'en' });
  });

  it('中文映射按规范化原文精确命中', () => {
    expect(lookupMappedAudio('床前明月光', maps)).toEqual({ path: '/audio/zh/aaa.mp3', kind: 'zh' });
    expect(lookupMappedAudio('  床前明月光 ', maps)).toEqual({
      path: '/audio/zh/aaa.mp3',
      kind: 'zh',
    });
  });

  it('未命中与空文本返回 null', () => {
    expect(lookupMappedAudio('天上地下', maps)).toBeNull();
    expect(lookupMappedAudio('', maps)).toBeNull();
    expect(lookupMappedAudio('   ', maps)).toBeNull();
  });
});
