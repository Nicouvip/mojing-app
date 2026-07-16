import json, requests

with open('config.json') as f:
    cfg = json.load(f)
key = cfg['asr_api_key']

payload = {
    'model': 'mimo-v2.5-pro',
    'messages': [
        {'role': 'system', 'content': '你是一个文字分析助手。'},
        {'role': 'user', 'content': '用一句话说明"对轨"在音频制作中的意思。'}
    ],
}

headers = {'api-key': [redacted], 'Content-Type': 'application/json'}

resp = requests.post(
    'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
    headers=headers, data=json.dumps(payload), timeout=30
)
result = resp.json()
print(json.dumps(result, ensure_ascii=False, indent=2)[:2000])
