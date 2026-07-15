@echo off
cd /d "%~dp0backend"
echo 正在启动 AutoTrack...
echo 浏览器自动打开 http://127.0.0.1:5000
start http://127.0.0.1:5000
python app.py
pause
