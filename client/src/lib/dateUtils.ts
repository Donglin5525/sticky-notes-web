import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 将时间戳转换为北京时间的 Date 对象
 * 数据库存储的是 UTC 时间戳，需要转换为北京时间显示
 */
export function toBeiJingTime(timestamp: number | Date): Date {
  const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp;
  return date;
}

/**
 * 格式化为相对时间（如"3分钟前"）
 * 使用中文本地化
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const date = toBeiJingTime(timestamp);
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: zhCN,
  });
}

/**
 * 格式化为北京时间的完整日期时间字符串
 * 格式：2024年1月21日 14:30
 */
export function formatBeijingDateTime(timestamp: number | Date): string {
  const date = toBeiJingTime(timestamp);
  return format(date, "yyyy年M月d日 HH:mm", { locale: zhCN });
}

/**
 * 格式化为北京时间的日期字符串
 * 格式：2024年1月21日
 */
export function formatBeijingDate(timestamp: number | Date): string {
  const date = toBeiJingTime(timestamp);
  return format(date, "yyyy年M月d日", { locale: zhCN });
}

/**
 * 格式化为北京时间的时间字符串
 * 格式：14:30
 */
export function formatBeijingTime(timestamp: number | Date): string {
  const date = toBeiJingTime(timestamp);
  return format(date, "HH:mm", { locale: zhCN });
}

/**
 * 格式化为北京时间的短日期格式
 * 格式：1月21日
 */
export function formatBeijingShortDate(timestamp: number | Date): string {
  const date = toBeiJingTime(timestamp);
  return format(date, "M月d日", { locale: zhCN });
}
