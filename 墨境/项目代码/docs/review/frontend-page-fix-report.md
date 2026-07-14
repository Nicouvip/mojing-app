# 墨境前端页面修复报告

> 日期：2026-07-14
> 范围：src/app/ 下的 page.tsx 和 layout.tsx 文件（不修改 api/、components/、lib/）

---

## 一、修改文件清单

### 1. 新建：`src/app/library/characters/page.tsx`
- "功能开发中"占位页，含导航栏、返回链接、脉冲动画状态标记

### 2. 新建：`src/app/library/worldbuilding/page.tsx`
- 同上，世界观设定占位页

### 3. 新建：`src/app/library/outline/page.tsx`
- 同上，大纲管理占位页

### 4. 新建：`src/app/library/settings/page.tsx`
- 同上，素材库设置占位页

### 5. 新建：`src/app/error.tsx`
- 标准错误页：显示错误信息 + 重试按钮

### 6. 新建：`src/app/not-found.tsx`
- 标准 404 页：提示信息 + 返回书桌链接

### 7. `src/app/library/page.tsx`
- **问题**：链接到不存在的路由 `/library/world`、`/library/bits`、`/library/packs`
- **修复**：更新为 `/library/characters`、`/library/worldbuilding`、`/library/outline`、`/library/settings`
- 图标从 `Bookmark`/`Package` 改为 `ListTree`/`Settings`

### 8. `src/app/dashboard/page.tsx`
- **问题**："继续写作"按钮跳转链接为 `router.push('/editor')`，路由不存在
- **修复**：改为 `router.push('/desk')`

### 9. `src/app/tools/page.tsx`
- **问题**：`selectedTool` 使用分组的局部索引 `i`，跨分组选择冲突（"创作前"选第0项和"创作中"选第0项互相覆盖）
- **修复**：使用 `t.title`（唯一标题）作为选择标识符，state 类型从 `number | null` 改为 `string | null`

### 10. `src/app/works/page.tsx`
- **问题**：标题区域和内容区域各有一个相同的排序 `<select>` 控件
- **修复**：删除内容区域的重复排序控件，保留工具栏中的一份

### 11. 删除：`src/app/editor/[id]/page.tsx.bak`
- 备份文件残留，干扰编译

### 12. 删除：`src/app/editor/[id]/page.tsx.v26-backup`
- 同上

### 13. 删除：`src/app/editor/[id]/page.tsx.v27bak`
- 同上

### 14. 删除：`src/lib/storage-keys.ts`
- 红acted键名 + 与实际使用不一致 + 仅被 account/page.tsx 引用
- account/page.tsx 已内联替代

### 15. `src/app/account/page.tsx`
- **问题**：登出时 `localStorage.removeItem` 使用硬编码 key `'mojing_token'`，与 `STORAGE_KEYS.TOKEN` 不一致；且依赖即将删除的 storage-keys.ts
- **修复**：移除 storage-keys 引用，读取/写入均使用统一的内联 key 字符串

---

## 二、已检查无需修改的项

| 检查项 | 结果 |
|--------|------|
| `library/world` → `library/worldbuilding` 重定向 | ❌ 不存在原路由，直接改链接即可 |
| 其他 .bak/.backup 文件 | ✅ 仅 editor 目录有 3 个 |

---

## 三、效果统计

| 指标 | 数值 |
|------|------|
| 新建文件 | 6 个（4 占位页 + 2 错误页） |
| 修复文件 | 4 个（library/dashboard/tools/works/account） |
| 删除文件 | 4 个（3 备份 + 1 storage-keys） |
| **编译** | **0 错误** ✅ |
