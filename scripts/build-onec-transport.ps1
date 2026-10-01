param(
    [string]$PlatformPath = 'C:\Program Files (x86)\1cv8t\8.5.1.1150\bin\1cv8t.exe'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$labRoot = Join-Path $taskRoot 'scratch/onec-lab'
$databasePath = Join-Path $labRoot 'build'
$sourcePath = Join-Path $labRoot 'transport-extension-source'
$artifactPath = Join-Path $labRoot 'KorsetTransport-lab.cfe'

if (-not (Test-Path -LiteralPath $PlatformPath -PathType Leaf)) {
    throw 'The specified 1C platform executable does not exist.'
}
if (-not (Test-Path -LiteralPath (Join-Path $databasePath '1Cv8.1CD') -PathType Leaf)) {
    throw 'An isolated configured laboratory database is required at scratch/onec-lab/build.'
}

New-Item -ItemType Directory -Path $sourcePath -Force | Out-Null
Copy-Item -Path (Join-Path $taskRoot 'integrations/onec/transport-extension/*') -Destination $sourcePath -Recurse -Force
$modulePath = Join-Path $sourcePath 'CommonModules/Krt_ConnectorTransport/Ext'
New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $taskRoot 'integrations/onec/KorsetTransport.bsl') -Destination (Join-Path $modulePath 'Module.bsl') -Force

function Invoke-LabDesigner {
    param([string[]]$Operation, [string]$LogName)
    $logPath = Join-Path $labRoot $LogName
    $arguments = @('DESIGNER', '/F', ('"' + $databasePath + '"')) + $Operation + @('/DisableStartupDialogs', '/Out', ('"' + $logPath + '"'))
    $job = Start-Process -FilePath $PlatformPath -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
    if ($job.ExitCode -ne 0) {
        $details = Get-Content -LiteralPath $logPath -ErrorAction SilentlyContinue
        throw "1C Designer failed with exit code $($job.ExitCode): $details"
    }
    Write-Output "$LogName : exit code 0"
}

Invoke-LabDesigner -Operation @('/LoadConfigFromFiles', ('"' + $sourcePath + '"'), '-Extension', 'KorsetTransport') -LogName 'transport-extension-load.log'
Invoke-LabDesigner -Operation @('/CheckConfig', '-Extension', 'KorsetTransport', '-Server', '-ThinClient', '-ExternalConnection') -LogName 'transport-extension-check.log'
Invoke-LabDesigner -Operation @('/DumpCfg', ('"' + $artifactPath + '"'), '-Extension', 'KorsetTransport') -LogName 'transport-extension-package.log'
Get-Item -LiteralPath $artifactPath | Select-Object FullName, Length
$artifactHash = Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256
Write-Output "SHA256: $($artifactHash.Hash)"
