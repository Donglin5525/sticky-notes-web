#!/usr/bin/env node
/**
 * 版本发布检查清单脚本
 * 
 * 使用方法：
 *   pnpm release:check
 * 
 * 检查项目：
 * 1. 版本号是否已更新（与上一个 Git 标签对比）
 * 2. 更新日志是否已填写（不包含"待填写"字样）
 * 3. 单元测试是否通过
 * 4. TypeScript 类型检查是否通过
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 开始版本发布检查...\n');

let allPassed = true;
const results = [];

// 1. 检查版本号
function checkVersion() {
  console.log('📦 检查版本号...');
  
  const versionFilePath = path.join(rootDir, 'shared', 'version.ts');
  const versionContent = fs.readFileSync(versionFilePath, 'utf-8');
  
  const versionMatch = versionContent.match(/APP_VERSION = "(\d+\.\d+\.\d+)"/);
  if (!versionMatch) {
    results.push({ name: '版本号', status: '❌', message: '无法读取版本号' });
    allPassed = false;
    return;
  }
  
  const currentVersion = versionMatch[1];
  
  // 检查版本标题是否已填写
  const titleMatch = versionContent.match(/APP_VERSION_TITLE = "(.*)"/);
  if (titleMatch && titleMatch[1] === '待填写') {
    results.push({ name: '版本号', status: '⚠️', message: `v${currentVersion} - 版本标题未填写` });
    allPassed = false;
    return;
  }
  
  results.push({ name: '版本号', status: '✅', message: `v${currentVersion}` });
}

// 2. 检查更新日志
function checkChangelog() {
  console.log('📋 检查更新日志...');
  
  const changelogFilePath = path.join(rootDir, 'shared', 'changelog.json');
  const changelogContent = fs.readFileSync(changelogFilePath, 'utf-8');
  const changelog = JSON.parse(changelogContent);
  
  if (!changelog.entries || changelog.entries.length === 0) {
    results.push({ name: '更新日志', status: '❌', message: '更新日志为空' });
    allPassed = false;
    return;
  }
  
  const latestEntry = changelog.entries[0];
  
  // 检查是否包含待填写内容
  if (latestEntry.title.includes('待填写') || 
      latestEntry.changes.some(c => c.includes('待填写'))) {
    results.push({ name: '更新日志', status: '⚠️', message: `v${latestEntry.version} 包含未填写内容` });
    allPassed = false;
    return;
  }
  
  results.push({ name: '更新日志', status: '✅', message: `v${latestEntry.version} - ${latestEntry.title}` });
}

// 3. 运行单元测试
function checkTests() {
  console.log('🧪 运行单元测试...');
  
  try {
    execSync('pnpm test', { cwd: rootDir, stdio: 'pipe' });
    results.push({ name: '单元测试', status: '✅', message: '所有测试通过' });
  } catch (error) {
    results.push({ name: '单元测试', status: '❌', message: '测试失败' });
    allPassed = false;
  }
}

// 4. TypeScript 类型检查
function checkTypeScript() {
  console.log('📝 TypeScript 类型检查...');
  
  try {
    execSync('pnpm check', { cwd: rootDir, stdio: 'pipe' });
    results.push({ name: 'TypeScript', status: '✅', message: '类型检查通过' });
  } catch (error) {
    results.push({ name: 'TypeScript', status: '❌', message: '类型错误' });
    allPassed = false;
  }
}

// 执行所有检查
checkVersion();
checkChangelog();
checkTests();
checkTypeScript();

// 输出结果
console.log('\n' + '='.repeat(50));
console.log('📊 检查结果汇总\n');

results.forEach(r => {
  console.log(`${r.status} ${r.name}: ${r.message}`);
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 所有检查通过！可以发布版本。\n');
  console.log('📝 下一步操作：');
  console.log('   1. 保存检查点 (webdev_save_checkpoint)');
  console.log('   2. 点击 Publish 按钮发布');
  process.exit(0);
} else {
  console.log('⚠️ 部分检查未通过，请修复后再发布。\n');
  process.exit(1);
}
