# 墨境设计系统 — 速查卡

## 色彩速查（浅色主题）

```
背景色    bg-background          #f7f8fa    浅灰白
主色      bg-primary             #0071E3    苹果蓝
主色浅底  bg-primary-light       #e8f2ff    淡蓝
主色悬停  bg-primary-hover       #0066CC    深蓝
二级背景  bg-secondary           #f0f2f5    浅灰
柔和文字  text-muted-foreground  #8E929B    中灰
强调色    bg-accent / text-accent-foreground  绿色系
危险色    bg-destructive         #FF3B30    苹果红
警告色    bg-warning             #E8981D    琥珀
边框      border-border          rgba(0,0,0,0.06) 极浅黑
卡片背景  bg-card                #ffffff    纯白
侧栏背景  bg-sidebar             rgba(246,246,246,0.85)
遮罩      bg-overlay             rgba(0,0,0,0.35)
```

## 字号速查

```
页面大标题  text-2xl      24px/32px semibold
区块标题    text-xl       20px/28px semibold
卡片标题    text-lg       18px/26px semibold
UI 正文字体  text-[15px]  15px/22px normal
辅助文字    text-sm       14px/20px normal
小标签      text-xs       12px/16px normal
编辑器正文  18px/36px serif, line-height:2
```

## 阴影速查

```
卡片态    shadow-card      0 2px 8px rgba(0,0,0,0.04)
悬停态    shadow-elevated  0 4px 16px rgba(0,0,0,0.08)
弹窗      shadow-modal     0 8px 32px rgba(0,0,0,0.12)
```

## 组件 Tailwind 模板

### Button (Primary)
```
className="bg-primary text-primary-foreground hover:bg-primary-hover 
           shadow-sm h-9 px-4 rounded-md text-sm font-medium
           transition-colors duration-150"
```

### Sidebar Item (默认)
```
className="px-4 py-2.5 text-sm rounded-md 
           hover:bg-sidebar-hover 
           data-[active=true]:bg-sidebar-active data-[active=true]:text-primary
           transition-colors duration-150"
```

### Card
```
className="bg-card rounded-lg shadow-card border border-border p-4"
```

### Dialog Modal
```
// 遮罩
className="fixed inset-0 bg-overlay backdrop-blur-sm z-50"
// 弹窗
className="bg-card rounded-xl shadow-modal max-w-md w-full mx-4 p-6"
```

### Badge (Warning)
```
className="bg-warning-light text-warning text-xs px-2 py-0.5 rounded-sm"
```
