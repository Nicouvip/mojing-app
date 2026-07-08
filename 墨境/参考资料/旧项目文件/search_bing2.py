import urllib.request, re, urllib.parse
req = urllib.request.Request(
    "https://cn.bing.com/search?q=" + urllib.parse.quote("蛙蛙写作 AI写作工具"),
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9"
    }
)
html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="replace")
urls = re.findall(r'href="(https?://[^"]+)"', html)
for u in urls:
    b = u.lower()
    if not any(x in b for x in ["bing", "microsoft", "miit", "beian", "mps"]):
        print(u[:200])
