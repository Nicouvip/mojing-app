@echo off
cd /d "%~dp0backend"
echo 启动 AutoTrack 服务...
start /MIN "" python app.py
timeout /t 5 /nobreak >nul
start http://127.0.0.1:5000
echo.
echo 服务已启动！如果浏览器没自动打开，请手动访问 http://127.0.0.1:5000
echo 关闭这个窗口不会影响后端运行（最小化窗口在任务栏）
pause
