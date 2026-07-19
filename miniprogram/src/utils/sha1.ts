/**
 * sha1 —— 纯 JS 实现的 SHA-1（UTF-8 安全，无环境依赖）。
 *
 * 用途：把任意朗读文本映射为文件名安全的哈希串，供「预生成音频」与
 * 「云函数在线合成兜底」双方按同一规则命名音频文件：
 *   sha1(`zh-CN|${text}`) → /audio/zh/<hash>.mp3
 *
 * 小程序端无法使用 node:crypto，故自带实现；构建期脚本与云函数用
 * node:crypto 计算同一输入，输出必须一致（有单测与 node:crypto 交叉验证）。
 */

/** 32 位循环左移（结果保持 int32） */
function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) | 0;
}

/** UTF-8 编码为字节数组（含代理对与孤立代理处理，孤立代理按 U+FFFD 编码） */
function utf8Bytes(msg: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < msg.length) {
      const c2 = msg.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        i++;
        const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
      } else {
        bytes.push(0xef, 0xbf, 0xbd);
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      bytes.push(0xef, 0xbf, 0xbd);
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

/** 转 8 位小写 hex（不用 padStart，兼容低版本基础库） */
function toHex8(h: number): string {
  let s = (h >>> 0).toString(16);
  while (s.length < 8) s = '0' + s;
  return s;
}

/** 计算字符串的 SHA-1，返回 40 位小写 hex */
export function sha1(msg: string): string {
  const bytes = utf8Bytes(msg);
  const bitLen = bytes.length * 8;

  // 填充：0x80 + 0x00... + 8 字节大端位长度
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  for (let i = 24; i >= 0; i -= 8) bytes.push((hi >>> i) & 0xff);
  for (let i = 24; i >= 0; i -= 8) bytes.push((lo >>> i) & 0xff);

  let h0 = 0x67452301 | 0;
  let h1 = 0xefcdab89 | 0;
  let h2 = 0x98badcfe | 0;
  let h3 = 0x10325476 | 0;
  let h4 = 0xc3d2e1f0 | 0;

  const w = new Array<number>(80);
  for (let block = 0; block < bytes.length; block += 64) {
    for (let t = 0; t < 16; t++) {
      const o = block + t * 4;
      w[t] = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) | 0;
    }
    for (let t = 16; t < 80; t++) {
      w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + f + e + k + w[t]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return toHex8(h0) + toHex8(h1) + toHex8(h2) + toHex8(h3) + toHex8(h4);
}
