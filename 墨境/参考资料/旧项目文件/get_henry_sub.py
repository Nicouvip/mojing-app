import re, json, requests

with open(r'D:\codexvip\yt_henry.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'var ytInitialPlayerResponse = ({.*?});', html, re.DOTALL)
if m:
    pr = json.loads(m.group(1))
    caps = pr.get('captions', {}).get('playerCaptionsTracklistRenderer', {})
    tracks = caps.get('captionTracks', [])
    for t in tracks:
        if t.get('languageCode') == 'zh-CN':
            url = t['baseUrl']
            print(f'Caption URL found, length: {len(url)}')
            # Download the captions
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                events = data.get('events', [])
                for e in events:
                    segs = e.get('segs', [])
                    text = ''.join(s.get('utf8', '') for s in segs)
                    if text.strip():
                        start = e.get('tStartMs', 0) / 1000
                        print(f'[{start:.1f}s] {text}')
            else:
                print(f'Failed: {resp.status_code}')
                # Try XML format
                resp2 = requests.get(url + '&fmt=srv1', timeout=10)
                print(f'XML status: {resp2.status_code}')
                print(resp2.text[:500])
