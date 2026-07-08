import json, re
from collections import Counter

sessions_path = r'C:\Users\nicou\AppData\Roaming\reasonix\projects\D--建网站\sessions\.display.json'

with open(sessions_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

all_msgs = []
for session, msgs in data.items():
    if msgs:
        for msg_id, text in msgs.items():
            if len(text) > 10:
                all_msgs.append(text)

print(f"总消息数: {len(all_msgs)}")

img_msgs = [m for m in all_msgs if 'image.png' in m or '.png' in m]
print(f"带截图的反馈: {len(img_msgs)} 条")

ref_msgs = [m for m in all_msgs if 'http' in m or '.txt' in m or '.md' in m]
print(f"带参考资料的: {len(ref_msgs)} 条")

# 用户的高频关注点
dimensions = Counter()
keywords = {
    'UI/布局/间距': ['滚动', '间距', '对齐', '位置', '边距', '像素', '边线'],
    '视觉/颜色': ['颜色', '黑线', '挡住', '美观', '好看', '风格'],
    '功能/交互': ['功能', '点击', '无法', '没有', '还能', '做了', '实现'],
    '质量/标准': ['错误', 'bug', '修复', '检查', '编译', '验证'],
    '学习/参考': ['参考', '学习', '看看', '这个', '可以', '我们'],
    '产品对比': ['Kimi', '人家', '别的', '他这里', '你看']
}

for m in all_msgs:
    for dim, kws in keywords.items():
        if any(kw in m for kw in kws):
            dimensions[dim] += 1

print()
print("=== 关注维度 ===")
for dim, count in dimensions.most_common(10):
    print(f"  {dim}: {count}次")

print()
print("=== 典型表达 ===")
# 找一些有代表性的
for m in all_msgs:
    if len(m) > 50 and any(kw in m for kw in ['零像素', '完美', '不行啊', '怎么回事', '参考一下', '客观判断', '你觉得如何']):
        print(f"  {m[:200]}")
        break
