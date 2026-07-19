/**
 * sha1 单测：已知向量 + 与 node:crypto 的交叉验证（含中文、emoji、长文本）。
 * 命名契约要求本实现与构建期脚本/云函数的 node:crypto sha1 输出完全一致。
 */
import { createHash } from 'node:crypto';
import { sha1 } from './sha1';

/** node:crypto 参考实现 */
function refSha1(s: string): string {
  return createHash('sha1').update(s, 'utf8').digest('hex');
}

describe('sha1', () => {
  it('匹配公开已知向量', () => {
    expect(sha1('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(sha1('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(sha1('The quick brown fox jumps over the lazy dog')).toBe(
      '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
    );
  });

  it('与 node:crypto 对中文/拼音/混合文本一致', () => {
    const samples = [
      '你好',
      'zh-CN|静夜思。李白。床前明月光，疑是地上霜。',
      'zh-CN|咏鹅。骆宾王。鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。',
      '找一找拼音为 bā 的字，比如 八',
      '1 米 = ? 厘米',
      '平行四边形是平面图形还是立体图形？',
      '🦢emoji 代理对',
      'x'.repeat(1000), // 跨多个 64 字节块
      '多\n  空白 \t 折叠',
    ];
    for (const s of samples) {
      expect(sha1(s)).toBe(refSha1(s));
    }
  });
});
