import sys; sys.path.insert(0, '.')
from app import app
import threading, time
t = threading.Thread(target=lambda: app.run(host='127.0.0.1', port=5002, debug=False), daemon=True)
t.start()
time.sleep(3)

import requests, os
B = 'http://127.0.0.1:5002'

with open('uploads/第三篇-001-007-一束光的麦.mp3', 'rb') as f:
    r = requests.post(f'{B}/api/audio/upload', files={'file': f})
c = r.json()['clip']
p = c['file_path']
fname = os.path.basename(p)
print(f'path: {p}')
print(f'file: {fname}')
has_uuid = len(fname) > 20 and fname[8] == '_' and fname[:8].isalnum()
print(f'Has UUID prefix: {has_uuid}')
if has_uuid:
    print('ERROR: Still using UUID prefix - old code!')
    sys.exit(1)

requests.post(f'{B}/api/asr/config', json={'api_key': 'tp-c233nqeu5oovmyuhzdml2bsfs2vjwuey53g74trfpf4ov5m7', 'language': 'zh'})
with open(r'C:\Users\nicou\OneDrive\桌面\文档\《黑莲花复仇手册》【第1章-第10章】.txt', 'r', encoding='utf-8') as f:
    requests.post(f'{B}/api/script', json={'text': f.read()[:5000]})

with open('uploads/第三篇-001-007-一束光的麦.mp3', 'rb') as f:
    requests.post(f'{B}/api/audio/upload', files={'file': f})

requests.post(f'{B}/api/asr/transcribe/1', timeout=30)
d = requests.post(f'{B}/api/align').json()
print(f'Timeline: {len(d.get("timeline", []))} entries')

r = requests.post(f'{B}/api/export', json={'timeline': d.get('timeline', [])})
d2 = r.json()
print(f'Export result: {d2.get("export_name", d2.get("error", "unknown"))}')
if 'export_name' in d2:
    print('SUCCESS: Full flow works!')
