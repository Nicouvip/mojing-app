import re
path = 'D:/codexvip/墨境/项目代码/src/app/api/audiobook/generate/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
if 'import { auth }' not in content:
    old = 'import { NextRequest, NextResponse } from ' + chr(39) + 'next/server' + chr(39)
    new = old + chr(10) + 'import { auth } from ' + chr(39) + '@/auth' + chr(39)
    content = content.replace(old, new)
auth_block = '    const session = await auth()' + chr(10) + '    if (!session?.user) {' + chr(10) + '      return NextResponse.json({ error: ' + chr(39) + chr(25991) + chr(35831) + chr(20808) + chr(30331) + chr(24405) + chr(39) + ' }, { status: 401 })' + chr(10) + '    }' + chr(10)
if 'const session = await auth()' not in content:
    content = content.replace('    const body = await request.json()', auth_block + '    const body = await request.json()')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('generate/route.ts patched')
