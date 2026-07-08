import urllib.request, re
req = urllib.request.Request(
    "https://cn.bing.com/search?q=" + urllib.parse.quote("蛙蛙写作"),
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
)
try:
    html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="replace")
    urls = re.findall(r'href="(https?://[^"]+)"', html)
    for u in urls:
        if "bing.com" not in u and "microsoft.com" not in u:
            print(u[:200])
except Exception as e:
    print(f"Error: {e}")
