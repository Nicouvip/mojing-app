@echo off
cd /d "%~dp0backend"

:: 检查 Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 Python，请先安装
    pause
    exit /b 1
)

:: 检查依赖
python -c "import flask, librosa, numpy, soundfile, requests, faster_whisper" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 正在安装依赖...
    pip install -r requirements.txt
)

:: 清理旧进程
taskkill /f /im python.exe 2>nul >nul

:: 启动后端（新窗口，不会因为本窗口关闭而停止）
echo 🎧 正在启动 AutoTrack...
start "AutoTrack" /MIN python app.py

timeout /t 4 /nobreak >nul

:: 检查服务
python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/project',timeout=3)" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ 服务尚未就绪，再等待...
    timeout /t 3 /nobreak >nul
)

start http://127.0.0.1:5000

echo.
echo ✅ AutoTrack 已启动！
echo   前端: http://127.0.0.1:5000
echo   后端在任务栏最小化窗口中运行
echo.
pause >nul
