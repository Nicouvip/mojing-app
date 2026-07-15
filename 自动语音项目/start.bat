@echo off
chcp 65001 >nul
title AutoTrack - 自动对轨工具
cd /d "%~dp0"

echo ============================================
echo   🎧 AutoTrack - 自动对轨工具
echo ============================================
echo.

:: 检测 Python（支持常见路径）
set PYTHON_CMD=
where python 2>nul >nul
if %ERRORLEVEL% EQU 0 ( set PYTHON_CMD=python ) & goto :FOUND_PYTHON
if exist "D:\Python312\python.exe" ( set PYTHON_CMD=D:\Python312\python.exe ) & goto :FOUND_PYTHON
if exist "C:\Python312\python.exe" ( set PYTHON_CMD=C:\Python312\python.exe ) & goto :FOUND_PYTHON
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" ( set PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe ) & goto :FOUND_PYTHON
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" ( set PYTHON_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe ) & goto :FOUND_PYTHON

echo ❌ 未找到 Python
echo 请安装 Python 3.12+ 后重试
pause
exit /b 1

:FOUND_PYTHON
echo ✅ Python: %PYTHON_CMD%
%PYTHON_CMD% --version

:: 进入 backend 目录
cd backend

:: 检查并安装依赖
echo.
echo [1/3] 检查依赖...
%PYTHON_CMD% -c "import flask, librosa, numpy, soundfile, requests" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 正在安装依赖（首次运行需要）...
    %PYTHON_CMD% -m pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖就绪
)

:: 清理旧进程（防止端口占用）
echo.
echo [2/3] 清理旧服务...
taskkill /f /im python.exe 2>nul >nul
timeout /t 1 /nobreak >nul

:: 启动 Flask
echo [3/3] 启动后端服务...
start "AutoTrack" /MIN %PYTHON_CMD% app.py

:: 等待并检查
echo 等待服务启动...
timeout /t 5 /nobreak >nul

%PYTHON_CMD% -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/project',timeout=3)" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ 再等一会儿...
    timeout /t 3 /nobreak >nul
)

:: 打开浏览器
start http://127.0.0.1:5000

echo.
echo ✅ 启动完成！
echo.
echo   前端地址: http://127.0.0.1:5000
echo   已自动打开浏览器 ^(如未弹出请手动访问^)
echo.
echo   关闭方式：任务管理器结束 python.exe
echo   或重启电脑即可
echo.
pause
