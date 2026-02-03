#!/usr/bin/env node
/**
 * Git Pre-commit 钩子脚本
 * 
 * 检查项目：
 * 1. TypeScript 类型检查
 * 2. 代码格式检查
 * 
 * 安装方法：
 *   pnpm prepare
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Pre-commit 检查...\n');

let allPassed = true;

// 1. TypeScript 类型检查
function checkTypeScript() {
  console.log('📝 TypeScript 类型检查...');
  
  try {
    execSync('pnpm check', { cwd: rootDir, stdio: 'pipe' });
    console.log('   ✅ 类型检查通过\n');
  } catch (error) {
    console.log('   ❌ 类型检查失败\n');
    allPassed = false;
  }
}

// 2. 运行单元测试
function checkTests() {
  console.log('🧪 运行单元测试...');
  
  try {
    execSync('pnpm test', { cwd: rootDir, stdio: 'pipe' });
    console.log('   ✅ 所有测试通过\n');
  } catch (error) {
    console.log('   ❌ 测试失败\n');
    allPassed = false;
  }
}

// 执行检查
checkTypeScript();
checkTests();

if (allPassed) {
  console.log('✅ Pre-commit 检查通过\n');
  process.exit(0);
} else {
  console.log('❌ Pre-commit 检查失败，请修复后再提交\n');
  process.exit(1);
}
