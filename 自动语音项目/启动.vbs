CreateObject("WScript.Shell").Run "cmd /c cd /d D:\codexvip\自动语音项目\backend && python app.py", 0, False
WScript.Sleep 3000
CreateObject("WScript.Shell").Run "http://127.0.0.1:5000"
