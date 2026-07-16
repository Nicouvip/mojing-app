import sys, json, requests
sys.path.insert(0, '.')
from core.ai_matcher import MimoMatcherConfig, ai_match_clips

with open('config.json') as f:
    cfg = json.load(f)

config = MimoMatcherConfig(api_key=cfg['asr_api_key'])

r = requests.get('http://127.0.0.1:5000/api/audio/list')
clips = r.json()['clips']
clip_data = [{'label': c['label'], 'asr_text': c.get('asr_text',''), 'role': c.get('role','')} for c in clips if c.get('asr_text')]

r = requests.get('http://127.0.0.1:5000/api/script')
full_text = r.json()['script']['lines'][0]['text']

print(f'文件数: {len(clip_data)}')
print(f'剧本: {len(full_text)}字')
print('调用AI匹配...')
result = ai_match_clips(clip_data, full_text, config)
print(f'结果: {len(result)}条')
for r2 in result:
    print(f'  {r2["source_clip"][:25]} conf={r2["confidence"]:.0%}')
