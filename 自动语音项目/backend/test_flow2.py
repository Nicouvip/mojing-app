import requests, sys, json
sys.path.insert(0, 'D:/codexvip/自动语音项目/backend')
B = 'http://127.0.0.1:5000'

# 导入完整剧本
with open(r'C:\Users\nicou\OneDrive\桌面\文档\《黑莲花复仇手册》【第1章-第10章】.txt','r',encoding='utf-8') as f:
    full = f.read()
r = requests.post(f'{B}/api/script', json={'text': full})
script_len = len(r.json()['script']['lines'][0]['text'])
print(f'剧本: {script_len}字')

# 上传音频
with open('uploads/第三篇-001-007-一束光的麦.mp3','rb') as f:
    r = requests.post(f'{B}/api/audio/upload', files={'file': f})
print(f'上传: {r.json()["clip"]["label"]}')

# ASR
r = requests.post(f'{B}/api/asr/transcribe/0', timeout=30)
has_asr = r.json().get('asr_text', '')
print(f'ASR: {len(has_asr)}字')

# 对齐
d = requests.post(f'{B}/api/align').json()
t = d.get('timeline',[])
print(f'对齐: {len(t)}条')
for e in t:
    print(f'  [{e["role"]}] conf={e["confidence"]:.0%}')
