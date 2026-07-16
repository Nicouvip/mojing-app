$p = Start-Process -FilePath "D:\Python312\python.exe" -ArgumentList "D:\codexvip\自动语音项目\backend\app.py" -WorkingDirectory "D:\codexvip\自动语音项目\backend" -WindowStyle Hidden -PassThru
Write-Host "Started PID: $($p.Id)"
