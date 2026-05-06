param(
    [string]$DownloadsPath = "C:\Users\hp\Downloads",
    [string]$RepoPath = "",
    [string]$Branch = "main",

    # Change this if your app uses another dev port.
    [int]$DevPort = 3000,

    # Enables rescue cleanup for manually-started/stuck dev servers.
    [switch]$KillProcessUsingDevPort,

    # Polling backup in case FileSystemWatcher misses an event.
    [int]$PollSeconds = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AutomationPath = Join-Path $RepoPath ".automation"
$DeployScript = Join-Path $AutomationPath "deploy-latest-zip.ps1"
$WatcherLog = Join-Path $AutomationPath "watcher.log"

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-WatcherLog {
    param([string]$Message)

    Ensure-Directory $AutomationPath

    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$stamp] $Message"

    Write-Host $line
    Add-Content -LiteralPath $WatcherLog -Value $line
}

function Get-ZipFingerprint {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    $item = Get-Item -LiteralPath $Path
    return "$($item.FullName)|$($item.Length)|$($item.LastWriteTimeUtc.Ticks)"
}

function Wait-FileStable {
    param(
        [string]$Path,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $previousLength = -1
    $previousWrite = [datetime]::MinValue
    $stableCount = 0

    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Path -LiteralPath $Path)) {
            Start-Sleep -Milliseconds 500
            continue
        }

        $item = Get-Item -LiteralPath $Path

        $canOpen = $false

        try {
            $stream = [System.IO.File]::Open(
                $item.FullName,
                [System.IO.FileMode]::Open,
                [System.IO.FileAccess]::Read,
                [System.IO.FileShare]::None
            )
            $stream.Close()
            $canOpen = $true
        }
        catch {
            $canOpen = $false
        }

        if (
            $canOpen -and
            $item.Length -eq $previousLength -and
            $item.LastWriteTimeUtc -eq $previousWrite
        ) {
            $stableCount++

            if ($stableCount -ge 2) {
                return $true
            }
        }
        else {
            $stableCount = 0
        }

        $previousLength = $item.Length
        $previousWrite = $item.LastWriteTimeUtc

        Start-Sleep -Seconds 1
    }

    return $false
}

function Invoke-Deploy {
    param([string]$ZipPath)

    if (-not (Test-Path -LiteralPath $ZipPath)) {
        return
    }

    if ([System.IO.Path]::GetExtension($ZipPath).ToLowerInvariant() -ne ".zip") {
        return
    }

    Write-WatcherLog "Candidate zip detected: $ZipPath"

    $stable = Wait-FileStable -Path $ZipPath

    if (-not $stable) {
        Write-WatcherLog "Zip did not stabilize in time. Skipping for now: $ZipPath"
        return
    }

    $args = @(
        "-ExecutionPolicy", "Bypass",
        "-File", $DeployScript,
        "-DownloadsPath", $DownloadsPath,
        "-RepoPath", $RepoPath,
        "-ZipPath", $ZipPath,
        "-Branch", $Branch,
        "-DevPort", $DevPort
    )

    if ($KillProcessUsingDevPort) {
        $args += "-KillProcessUsingDevPort"
    }

    Write-WatcherLog "Starting deploy for: $ZipPath"

    $process = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList $args `
        -Wait `
        -PassThru `
        -NoNewWindow

    if ($process.ExitCode -eq 0) {
        Write-WatcherLog "Deploy finished successfully for: $ZipPath"
    }
    else {
        Write-WatcherLog "Deploy failed with exit code $($process.ExitCode) for: $ZipPath"
    }
}

function Get-LatestZip {
    if (-not (Test-Path -LiteralPath $DownloadsPath)) {
        return $null
    }

    return Get-ChildItem -LiteralPath $DownloadsPath -Filter "*.zip" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

function Main {
    Ensure-Directory $AutomationPath

    if (-not (Test-Path -LiteralPath $DeployScript)) {
        throw "Deploy script not found: $DeployScript"
    }

    if (-not (Test-Path -LiteralPath $DownloadsPath)) {
        throw "Downloads path does not exist: $DownloadsPath"
    }

    Write-WatcherLog "================ WATCHER START ================"
    Write-WatcherLog "Watching downloads path: $DownloadsPath"
    Write-WatcherLog "Repo path: $RepoPath"
    Write-WatcherLog "Deploy script: $DeployScript"

    $lastSeenFingerprint = ""

    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $DownloadsPath
    $watcher.Filter = "*.zip"
    $watcher.IncludeSubdirectories = $false
    $watcher.EnableRaisingEvents = $true

    Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier "ZipCreated" | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier "ZipRenamed" | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier "ZipChanged" | Out-Null

    Write-WatcherLog "Watcher is running. Leave this PowerShell window open."

    try {
        while ($true) {
            $event = Wait-Event -Timeout $PollSeconds

            if ($null -ne $event) {
                $path = $event.SourceEventArgs.FullPath
                Remove-Event -EventIdentifier $event.EventIdentifier -ErrorAction SilentlyContinue

                if ($path -and $path.ToLowerInvariant().EndsWith(".zip")) {
                    $fingerprint = Get-ZipFingerprint -Path $path

                    if ($fingerprint -and $fingerprint -ne $lastSeenFingerprint) {
                        $lastSeenFingerprint = $fingerprint
                        Invoke-Deploy -ZipPath $path
                    }
                }
            }

            # Poll backup. This catches cases where the download completed through rename
            # or the filesystem event was missed.
            $latest = Get-LatestZip

            if ($null -ne $latest) {
                $fingerprint = Get-ZipFingerprint -Path $latest.FullName

                if ($fingerprint -and $fingerprint -ne $lastSeenFingerprint) {
                    $lastSeenFingerprint = $fingerprint
                    Invoke-Deploy -ZipPath $latest.FullName
                }
            }
        }
    }
    finally {
        Unregister-Event -SourceIdentifier "ZipCreated" -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier "ZipRenamed" -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier "ZipChanged" -ErrorAction SilentlyContinue

        $watcher.Dispose()

        Write-WatcherLog "================ WATCHER STOP ================"
    }
}

Main