 =  D:\codexvip\墨境\项目代码\src
 = Join-Path  app\audiobook\*\page.tsx
 = Get-ChildItem 
foreach ( in ) {
     = [System.IO.File]::ReadAllText(.FullName)
    Write-Output === length: 0 ===
    Write-Output .Substring(0, [Math]::Min(10000, .Length))
}
