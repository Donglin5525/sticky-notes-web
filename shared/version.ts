import changelogData from "./changelog.json";

/**
 * 版本号唯一来源：从 changelog.json 第一条记录动态读取
 * 发布新版本时，只需在 shared/changelog.json 顶部添加新条目
 * 无需手动修改此文件
 */
const latestEntry = changelogData.entries[0];

export const APP_VERSION = latestEntry.version;
export const APP_VERSION_DATE = latestEntry.date;
export const APP_VERSION_TITLE = latestEntry.title;

// 用于检测用户是否看过当前版本的更新日志
export const VERSION_STORAGE_KEY = "app_last_seen_version";
