/**
 * Post-build 脚本：合并 app.wxss 的 @import 引用。
 *
 * 问题：
 *   Taro 3.6 默认把 app.wxss 拆分为：
 *     app.wxss        -> 仅含 @import "./app-origin.wxss"; @import "./common.wxss";
 *     app-origin.wxss -> 业务 CSS（含 Tailwind）
 *     common.wxss     -> 共享 CSS
 *   微信开发者工具某些版本对 app.wxss 中 @import 相对路径解析有 bug，
 *   报 "path './app-origin.wxss' not found from './app.wxss'"
 *   （即使文件确实存在）。
 *
 * 修复：
 *   构建后读取 app.wxss 中所有 @import，把目标文件内容内联进来，
 *   然后删除被引用的文件。这样 app.wxss 变成自包含的，不再有 @import。
 *
 * 用法：在 package.json 的 scripts 中：
 *   "build:weapp": "taro build --type weapp && node scripts/inline-wxss.mjs"
 */
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const appWxssPath = path.join(distDir, 'app.wxss');

if (!fs.existsSync(appWxssPath)) {
  console.warn('[inline-wxss] app.wxss not found, skipping');
  process.exit(0);
}

const importRegex = /@import\s+"([^"]+\.wxss)"\s*;/g;
const original = fs.readFileSync(appWxssPath, 'utf8');

let inlined = original;
const filesToDelete = [];

for (const match of original.matchAll(importRegex)) {
  const importPath = match[1];
  const fullPath = path.resolve(distDir, importPath);

  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    inlined = inlined.replace(match[0], `/* inlined from ${importPath} */\n${content}`);
    filesToDelete.push(fullPath);
    console.log(`[inline-wxss] inlined ${importPath} (${content.length} bytes)`);
  } else {
    console.warn(`[inline-wxss] not found: ${importPath}`);
  }
}

// 如果没有 @import 需要处理，直接退出
if (inlined === original) {
  console.log('[inline-wxss] no @import found, skipping');
  process.exit(0);
}

fs.writeFileSync(appWxssPath, inlined, 'utf8');
console.log(`[inline-wxss] app.wxss updated (${inlined.length} bytes)`);

// 删除已内联的文件
for (const file of filesToDelete) {
  fs.unlinkSync(file);
  console.log(`[inline-wxss] deleted ${path.basename(file)}`);
}

console.log('[inline-wxss] done');
