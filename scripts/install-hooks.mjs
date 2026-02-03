#!/usr/bin/env node
/**
 * Git 钩子安装脚本
 * 
 * 使用方法：
 *   pnpm prepare
 * 
 * 此脚本会将 pre-commit 钩子安装到 .git/hooks 目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const gitHooksDir = path.join(rootDir, '.git', 'hooks');
const preCommitHookPath = path.join(gitHooksDir, 'pre-commit');

// 检查 .git 目录是否存在
if (!fs.existsSync(path.join(rootDir, '.git'))) {
  console.log('⚠️ 未找到 .git 目录，跳过钩子安装');
  process.exit(0);
}

// 确保 hooks 目录存在
if (!fs.existsSync(gitHooksDir)) {
  fs.mkdirSync(gitHooksDir, { recursive: true });
}

// 创建 pre-commit 钩子
const hookContent = `#!/bin/sh
# Git pre-commit hook
# 由 pnpm prepare 自动安装

node scripts/pre-commit.mjs
`;

fs.writeFileSync(preCommitHookPath, hookContent);
fs.chmodSync(preCommitHookPath, '755');

console.log('✅ Git pre-commit 钩子已安装');
console.log('   位置: .git/hooks/pre-commit');
console.log('   每次提交前会自动运行类型检查和单元测试');
