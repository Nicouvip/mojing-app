path = 'D:/codexvip/墨境/项目代码/src/app/api/audiobook/generate/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(chr(25991) + chr(35831) + chr(20808) + chr(30331) + chr(24405), chr(35831) + chr(20808) + chr(30331) + chr(24405))
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('fixed')
