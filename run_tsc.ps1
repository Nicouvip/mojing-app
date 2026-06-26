cd 'D:\建网站\mojing-app'
$p = Start-Process -FilePath 'node' -ArgumentList '.\node_modules\typescript\bin\tsc.js,--noEmit,--pretty' -NoNewWindow -Wait -RedirectStandardOutput 'temp_tsc_o.txt' -RedirectStandardError 'temp_tsc_e.txt'
Write-Host "EXIT=$($p.ExitCode)"
if(Test-Path 'temp_tsc_o.txt'){Get-Content 'temp_tsc_o.txt'}
if(Test-Path 'temp_tsc_e.txt'){Get-Content 'temp_tsc_e.txt'}
Remove-Item 'temp_tsc_o.txt','temp_tsc_e.txt' -ErrorAction 0
