@echo off
chcp 65001 >nul
title AutoTrack - 环境检查

echo ============================================
echo   🔍 AutoTrack 环境诊断工具
echo ============================================
echo.

:: 1. 检查 Python
echo [1/5] 检查 Python...
where python 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python 未找到！请安装 Python 3.12+
    pause
    exit /b 1
)
python --version
echo ✅ Python 正常
echo.

:: 2. 检查目录
echo [2/5] 检查项目目录...
cd /d "%~dp0"
echo 项目根目录: %CD%
if exist backend\app.py (
    echo ✅ 找到 app.py
) else (
    echo ❌ 缺少 backend\app.py
    pause
    exit /b 1
)
echo.

:: 3. 检查依赖
echo [3/5] 检查依赖...
python -c "import flask" 2>nul && echo ✅ flask 已安装 || echo ❌ flask 未安装
python -c "import librosa" 2>nul && echo ✅ librosa 已安装 || echo ❌ librosa 未安装
python -c "import numpy" 2>nul && echo ✅ numpy 已安装 || echo ❌ numpy 未安装
python -c "import scipy" 2>nul && echo ✅ scipy 已安装 || echo ❌ scipy 未安装
python -c "import soundfile" 2>nul && echo ✅ soundfile 已安装 || echo ❌ soundfile 未安装
python -c "import requests" 2>nul && echo ✅ requests 已安装 || echo ❌ requests 未安装
python -c "import pydub" 2>nul && echo ✅ pydub 已安装 || echo ❌ pydub 未安装
echo.

:: 4. 检查端口
echo [4/5] 检查端口 5000...
netstat -ano | find ":5000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  端口 5000 已被占用！可能有其他程序在运行
    netstat -ano | find ":5000 "
) else (
    echo ✅ 端口 5000 可用
)
echo.

:: 5. 尝试启动
echo [5/5] 尝试启动服务（按 Ctrl+C 取消，等 5 秒自动关闭）...
cd /d "%~dp0backend"
echo 启动命令: python app.py
echo.
echo --- 服务输出 ---
timeout /t 5 /nobreak >nul
echo --- 测试请求 ---
python -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/api/project',timeout=3); print('✅ 服务响应正常:', r.status)" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 服务未正常启动，请把上面的输出截图发给开发者
)
echo.

pause
