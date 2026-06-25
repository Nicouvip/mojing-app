import { PageData } from './types';

const KEY_PREFIX = 'mojing_page_';
const BACKUP_PREFIX = 'mojing_page_backups_';

export function loadPage(path: string): PageData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePage(path: string, data: PageData): void {
  // 自动备份上一版本
  const prev = loadPage(path);
  if (prev) backupSave(path, prev);
  localStorage.setItem(KEY_PREFIX + path, JSON.stringify(data));
}

export function listPages(): string[] {
  if (typeof window === 'undefined') return [];
  const pages: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX) && !key.startsWith(BACKUP_PREFIX)) {
      pages.push(key.replace(KEY_PREFIX, ''));
    }
  }
  return pages;
}

// ===== 备份系统 =====

export interface PageBackup {
  timestamp: number
  label: string
  data: PageData
}

export function backupSave(path: string, data: PageData): void {
  if (typeof window === 'undefined') return;
  const key = BACKUP_PREFIX + path;
  const backups = listBackups(path);
  const label = new Date().toLocaleString('zh-CN');
  backups.push({ timestamp: Date.now(), label, data });
  // 仅保留最近 20 个备份
  const trimmed = backups.slice(-20);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function listBackups(path: string): PageBackup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_PREFIX + path);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function restoreBackup(path: string, timestamp: number): PageData | null {
  const backups = listBackups(path);
  const found = backups.find(b => b.timestamp === timestamp);
  if (!found) return null;
  savePage(path, found.data);
  return found.data;
}

// ===== 导入导出 =====

export function exportPage(path: string): string | null {
  const data = loadPage(path);
  if (!data) return null;
  return JSON.stringify(data, null, 2);
}

export function importPage(path: string, json: string): PageData {
  let data: PageData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('JSON 格式无效');
  }
  if (!data || !Array.isArray(data.components)) {
    throw new Error('页面数据缺少 components 字段');
  }
  savePage(path, data);
  return data;
}

// ===== 生效标记 =====

export function applyPage(path: string): boolean {
  const data = loadPage(path);
  if (!data) return false;
  data.version = 1; // 标记生效
  savePage(path, data);
  return true;
}

export function deletePage(path: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_PREFIX + path);
  localStorage.removeItem(BACKUP_PREFIX + path);
}
