$ErrorActionPreference = "Stop"
$logs = "C:\Audit\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null

function Write-Log {
  param([string]$Message)
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  "$ts | $Message" | Tee-Object -FilePath "$logs\Run.log" -Append
}

Write-Log "START: Windows maintenance"
sfc /scannow | Out-File "$logs\SFC.log"
UsoClient StartScan
UsoClient StartDownload  
UsoClient StartInstall
dsregcmd /status | Out-File "$logs\AAD_status.txt"
manage-bde -status | Out-File "$logs\BitLocker.txt"
Get-MpComputerStatus | Out-File "$logs\Defender.txt"
Compress-Archive -Path "$logs\*" -DestinationPath "C:\Audit\Evidence.zip" -Force
Write-Log "COMPLETE"
Write-Host "Evidence at C:\Audit"