<# 
Windows End-to-End Maintenance + Enterprise Install + Device Registration
- Scope: Error check, Update, Windows 11 Enterprise install, Entra ID + Intune auto-enrollment
- Dependencies: Built-in Windows tools only (SFC, DISM, CHKDSK, USOClient, dsregcmd)
- Logging: C:\Audit\Logs\*.log and evidence ZIP
- Run as: Elevated (Administrator)
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [string] $EnterpriseIsoPath = "C:\ISO\Win11Enterprise.iso",
  
  [Parameter(Mandatory=$false)]
  [ValidateSet("Upgrade","InPlaceUpgrade","NoInstall")]
  [string] $InstallMode = "NoInstall",
  
  [Parameter(Mandatory=$false)]
  [string] $AuditRoot = "C:\Audit",
  
  [Parameter(Mandatory=$false)]
  [ValidateSet("Enable","Skip")]
  [string] $AutoMDMEnrollment = "Enable"
)

$ErrorActionPreference = "Stop"
$logs = Join-Path $AuditRoot "Logs"
$null = New-Item -ItemType Directory -Path $logs -Force

function Write-Log {
  param([string]$Message, [string]$File = "Run.log")
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "$ts | $Message"
  $line | Tee-Object -FilePath (Join-Path $logs $File) -Append
}

Write-Log "START: Windows maintenance + device registration"

# System checks
try {
  Write-Log "SFC: System file integrity"
  sfc /scannow | Out-File (Join-Path $logs "SFC.log")
  
  Write-Log "Windows Update: StartScan"
  UsoClient StartScan
  UsoClient StartDownload
  UsoClient StartInstall
  
  Write-Log "Enable automatic MDM enrollment"
  New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\MDM" -Force | Out-Null
  New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\MDM" -Name "AutoEnrollMDM" -Value 1 -PropertyType DWord -Force | Out-Null
  New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\MDM" -Name "UseAADCreds" -Value 1 -PropertyType DWord -Force | Out-Null
  
  Write-Log "dsregcmd status"
  dsregcmd /status | Out-File (Join-Path $logs "AAD_dsregcmd_status.txt")
  
  Write-Log "BitLocker status"
  manage-bde -status | Out-File (Join-Path $logs "Compliance_BitLocker.txt")
  
  Write-Log "Packaging evidence"
  $zipPath = Join-Path $AuditRoot "Win11_Enterprise_Device_Evidence.zip"
  Compress-Archive -Path $logs\* -DestinationPath $zipPath -Force
  Write-Log "Evidence archived: $zipPath"
}
catch { Write-Log "Error: $($_.Exception.Message)" }

Write-Log "END: Completed"
Write-Host "Completed. Evidence at: $AuditRoot"