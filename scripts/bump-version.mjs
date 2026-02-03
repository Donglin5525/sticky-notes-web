#!/usr/bin/env node
/**
 * 版本号自动递增脚本
 * 
 * 使用方法：
 *   pnpm version:patch  - 递增修订版本 (1.4.0 -> 1.4.1)
 *   pnpm version:minor  - 递增次版本 (1.4.0 -> 1.5.0)
 *   pnpm version:major  - 递增主版本 (1.4.0 -> 2.0.0)
 * 
 * 脚本会自动：
 * 1. 更新 shared/version.ts 中的版本号和日期
 * 2. 在 shared/changelog.json 中添加新版本条目模板
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 获取版本递增类型
const bumpType = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ 无效的版本类型。请使用: patch, minor, 或 major');
  process.exit(1);
}

// 读取当前版本
const versionFilePath = path.join(rootDir, 'shared', 'version.ts');
const versionContent = fs.readFileSync(versionFilePath, 'utf-8');

const versionMatch = versionContent.match(/APP_VERSION = "(\d+)\.(\d+)\.(\d+)"/);
if (!versionMatch) {
  console.error('❌ 无法从 version.ts 中读取版本号');
  process.exit(1);
}

let [, major, minor, patch] = versionMatch.map(Number);
const oldVersion = `${major}.${minor}.${patch}`;

// 递增版本号
switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
const today = new Date().toISOString().split('T')[0];

console.log(`📦 版本升级: ${oldVersion} -> ${newVersion}`);

// 更新 version.ts
const newVersionContent = versionContent
  .replace(/APP_VERSION = "\d+\.\d+\.\d+"/, `APP_VERSION = "${newVersion}"`)
  .replace(/APP_VERSION_DATE = "\d{4}-\d{2}-\d{2}"/, `APP_VERSION_DATE = "${today}"`)
  .replace(/APP_VERSION_TITLE = ".*"/, `APP_VERSION_TITLE = "待填写"`);

fs.writeFileSync(versionFilePath, newVersionContent);
console.log('✅ 已更新 shared/version.ts');

// 更新 changelog.json
const changelogFilePath = path.join(rootDir, 'shared', 'changelog.json');
const changelogContent = fs.readFileSync(changelogFilePath, 'utf-8');
const changelog = JSON.parse(changelogContent);

// 添加新版本条目
const newEntry = {
  version: newVersion,
  date: today,
  title: "待填写版本标题",
  changes: [
    "待填写更新内容 1",
    "待填写更新内容 2"
  ]
};

changelog.entries.unshift(newEntry);

fs.writeFileSync(changelogFilePath, JSON.stringify(changelog, null, 2) + '\n');
console.log('✅ 已更新 shared/changelog.json');

console.log('');
console.log('📝 下一步操作：');
console.log('   1. 编辑 shared/version.ts 填写 APP_VERSION_TITLE');
console.log('   2. 编辑 shared/changelog.json 填写更新内容');
console.log('   3. 运行 pnpm test 确保测试通过');
console.log('   4. 保存检查点并发布');
