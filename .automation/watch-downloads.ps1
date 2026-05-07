param(
    [string]$DownloadsPath = "C:\Users\hp\Downloads",
    [string]$RepoPath = "C:\Users\hp\habits-planner-2",
    [string]$Branch = "main",

    [int]$DevPort = 3000,
    [switch]$KillProcessUsingDevPort,
    [int]$PollSeconds = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DownloadsPath)) {
    $DownloadsPath = "C:\Users\hp\Downloads"
}

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    $RepoPath = "C:\Users\hp\habits-planner-2"
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "main"
}

$DownloadsPath = [System.IO.Path]::GetFullPath($DownloadsPath)
$RepoPath = [System.IO.Path]::GetFullPath($RepoPath)

$AutomationPath = Join-Path $RepoPath ".automation"
$DeployScript = Join-Path $AutomationPath "deploy-latest-zip.ps1"
$WatcherLog = Join-Path $AutomationPath "watcher.log"

function Ensure-Directory {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "Cannot create directory because path is empty."
    }

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

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }

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

    if ([string]::IsNullOrWhiteSpace($ZipPath)) {
        return
    }

    if (-not (Test-Path -LiteralPath $ZipPath)) {
        Write-WatcherLog "Zip no longer exists. Skipping: $ZipPath"
        return
    }

    if ([System.IO.Path]::GetExtension($ZipPath).ToLowerInvariant() -ne ".zip") {
        return
    }

    $resolvedZipPath = (Get-Item -LiteralPath $ZipPath).FullName

    Write-WatcherLog "Candidate zip detected: $resolvedZipPath"

    $stable = Wait-FileStable -Path $resolvedZipPath

    if (-not $stable) {
        Write-WatcherLog "Zip did not stabilize in time. Skipping for now: $resolvedZipPath"
        return
    }

    Write-WatcherLog "Starting deploy for: $resolvedZipPath"

    try {
        if ($KillProcessUsingDevPort) {
            & $DeployScript `
                -DownloadsPath $DownloadsPath `
                -RepoPath $RepoPath `
                -ZipPath $resolvedZipPath `
                -Branch $Branch `
                -DevPort $DevPort `
                -KillProcessUsingDevPort 2>&1 | ForEach-Object {
                    Write-Host $_
                    Add-Content -LiteralPath $WatcherLog -Value $_
                }
        }
        else {
            & $DeployScript `
                -DownloadsPath $DownloadsPath `
                -RepoPath $RepoPath `
                -ZipPath $resolvedZipPath `
                -Branch $Branch `
                -DevPort $DevPort 2>&1 | ForEach-Object {
                    Write-Host $_
                    Add-Content -LiteralPath $WatcherLog -Value $_
                }
        }

        Write-WatcherLog "Deploy finished successfully for: $resolvedZipPath"
    }
    catch {
        Write-WatcherLog "Deploy failed for: $resolvedZipPath"
        Write-WatcherLog "Error: $($_.Exception.Message)"
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

function Drain-PendingEvents {
    while ($true) {
        $pending = Get-Event -ErrorAction SilentlyContinue | Where-Object {
            $_.SourceIdentifier -in @("ZipCreated", "ZipRenamed", "ZipChanged")
        }

        if ($null -eq $pending -or @($pending).Count -eq 0) {
            break
        }

        foreach ($event in @($pending)) {
            Remove-Event -EventIdentifier $event.EventIdentifier -ErrorAction SilentlyContinue
        }
    }
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

    $existingLatest = Get-LatestZip

    if ($null -ne $existingLatest) {
        $lastSeenFingerprint = Get-ZipFingerprint -Path $existingLatest.FullName
        Write-WatcherLog "Startup baseline zip recorded, not deploying existing file: $($existingLatest.FullName)"
    }
    else {
        Write-WatcherLog "No existing zip found at startup."
    }

    Drain-PendingEvents

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
                $path = $null

                try {
                    $path = $event.SourceEventArgs.FullPath
                }
                catch {
                    $path = $null
                }

                Remove-Event -EventIdentifier $event.EventIdentifier -ErrorAction SilentlyContinue

                if ($path -and $path.ToLowerInvariant().EndsWith(".zip")) {
                    $fingerprint = Get-ZipFingerprint -Path $path

                    if ($fingerprint -and $fingerprint -ne $lastSeenFingerprint) {
                        $lastSeenFingerprint = $fingerprint
                        Invoke-Deploy -ZipPath $path
                    }
                }
            }

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