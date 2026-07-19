/**
 * Jest 配置 —— 仅跑纯逻辑单测（node 环境，不依赖 wx / 微信开发者工具）。
 * 覆盖：utils/sha1、platform/ttsText 等无宿主依赖的模块。
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
