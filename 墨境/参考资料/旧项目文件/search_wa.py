import urllib.request, re, urllib.parse

# Try DuckDuckGo
req = urllib.request.Request(
    "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote("蛙蛙写作 官网 小说"),
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
)
try:
    html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="replace")
    urls = re.findall(r'<a[^>]*class="result__a"[^>]*href="(https?://[^"]+)"', html)
    if not urls:
        urls = re.findall(r'href="(https?://[^"]+)"', html)
    for u in urls:
        b = u.lower()
        if not any(x in b for x in ["duckduckgo", "twitter", "facebook"]):
            if 'wawa' in u.lower() or '蛙' in u or '%E8%9B%99' in u:
                print("FOUND: " + u[:200])
    if not any('蛙' in u for u in urls):
        for u in urls[:10]:
            if not any(x in u.lower() for x in ["duckduckgo", "twitter", "facebook"]):
                print(u[:150])
except Exception as e:
    print(f"Error: {e}")
