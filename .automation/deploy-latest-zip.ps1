param(
    [string]$DownloadsPath = "C:\Users\hp\Downloads",
    [string]$RepoPath = "C:\Users\hp\habits-planner-2",
    [string]$ZipPath = "",
    [string]$Branch = "main",

    [int]$DevPort = 3000,
    [switch]$KillProcessUsingDevPort,
    [switch]$CleanInstall,
    [switch]$NoGitPush,
    [switch]$Force
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
$LogFile = Join-Path $AutomationPath "deploy.log"
$PidFile = Join-Path $AutomationPath "npm-dev.pid"
$LastZipFile = Join-Path $AutomationPath "last-deployed-zip.txt"
$VersionFile = Join-Path $AutomationPath "version.txt"
$DevOutLog = Join-Path $AutomationPath "npm-dev.out.log"
$DevErrLog = Join-Path $AutomationPath "npm-dev.err.log"
$LockFile = Join-Path $AutomationPath "deploy.lock"

function Ensure-Directory {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "Cannot create directory because path is empty."
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-Log {
    param([string]$Message)

    Ensure-Directory $AutomationPath

    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$stamp] $Message"

    Write-Host $line
    Add-Content -LiteralPath $LogFile -Value $line
}

function Invoke-CommandLogged {
    param(
        [string]$Command,
        [string]$WorkingDirectory
    )

    Write-Log "RUN: $Command"

    $stdoutFile = Join-Path $env:TEMP ("deploy-stdout-" + [guid]::NewGuid().ToString("N") + ".log")
    $stderrFile = Join-Path $env:TEMP ("deploy-stderr-" + [guid]::NewGuid().ToString("N") + ".log")

    try {
        $process = Start-Process `
            -FilePath "$env:ComSpec" `
            -ArgumentList "/d /c $Command" `
            -WorkingDirectory $WorkingDirectory `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError $stderrFile `
            -NoNewWindow `
            -Wait `
            -PassThru

        if (Test-Path -LiteralPath $stdoutFile) {
            Get-Content -LiteralPath $stdoutFile -ErrorAction SilentlyContinue | ForEach-Object {
                Write-Host $_
                Add-Content -LiteralPath $LogFile -Value $_
            }
        }

        if (Test-Path -LiteralPath $stderrFile) {
            Get-Content -LiteralPath $stderrFile -ErrorAction SilentlyContinue | ForEach-Object {
                Write-Host $_
                Add-Content -LiteralPath $LogFile -Value $_
            }
        }

        if ($process.ExitCode -ne 0) {
            throw "Command failed with exit code $($process.ExitCode): $Command"
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
}

function Get-ZipFingerprint {
    param([string]$Path)

    $item = Get-Item -LiteralPath $Path
    return "$($item.FullName)|$($item.Length)|$($item.LastWriteTimeUtc.Ticks)"
}

function Wait-FileStable {
    param(
        [string]$Path,
        [int]$TimeoutSeconds = 120
    )

    Write-Log "Waiting for zip file to become stable: $Path"

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
                Write-Log "Zip file is stable."
                return
            }
        }
        else {
            $stableCount = 0
        }

        $previousLength = $item.Length
        $previousWrite = $item.LastWriteTimeUtc

        Start-Sleep -Seconds 1
    }

    throw "Timed out waiting for zip file to become stable: $Path"
}

function Find-LatestZip {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Downloads path does not exist: $Path"
    }

    $zip = Get-ChildItem -LiteralPath $Path -Filter "*.zip" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($null -eq $zip) {
        throw "No .zip files found in: $Path"
    }

    return $zip.FullName
}

function Find-ProjectRootInExtractedZip {
    param([string]$ExtractedPath)

    $packageFiles = @(
        Get-ChildItem -LiteralPath $ExtractedPath -Filter "package.json" -File -Recurse |
            Where-Object {
                $_.FullName -notmatch "\\node_modules\\"
            }
    )

    if ($packageFiles.Count -eq 0) {
        throw "Could not find package.json inside extracted zip."
    }

    $best = $packageFiles |
        Sort-Object {
            $relative = $_.DirectoryName.Substring($ExtractedPath.Length).TrimStart("\")
            if ([string]::IsNullOrWhiteSpace($relative)) {
                0
            }
            else {
                ($relative -split "\\").Count
            }
        } |
        Select-Object -First 1

    Write-Log "Detected project root inside zip: $($best.DirectoryName)"
    return $best.DirectoryName
}

function Stop-ManagedDevServer {
    if (Test-Path -LiteralPath $PidFile) {
        $rawPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1

        if ($rawPid -match "^\d+$") {
            $oldPid = [int]$rawPid

            $process = Get-Process -Id $oldPid -ErrorAction SilentlyContinue

            if ($null -ne $process) {
                Write-Log "Stopping managed npm dev process tree. PID: $oldPid"

                & "$env:ComSpec" /d /c "taskkill /PID $oldPid /T /F" 2>&1 | ForEach-Object {
                    Write-Host $_
                    Add-Content -LiteralPath $LogFile -Value $_
                }
            }
            else {
                Write-Log "Managed npm dev PID no longer exists: $oldPid"
            }
        }

        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    }
    else {
        Write-Log "No managed npm dev PID file found."
    }
}

function Stop-ProcessUsingPort {
    param([int]$Port)

    if (-not $KillProcessUsingDevPort) {
        return
    }

    Write-Log "Checking for process using dev port $Port."

    $connections = @()

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Could not inspect TCP port $Port. Skipping port cleanup."
        return
    }

    $pids = $connections |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -and $_ -gt 0 }

    foreach ($portPid in $pids) {
        $proc = Get-Process -Id $portPid -ErrorAction SilentlyContinue

        if ($null -eq $proc) {
            continue
        }

        $safeNames = @("node", "npm", "cmd", "powershell", "pwsh")

        if ($safeNames -contains $proc.ProcessName.ToLowerInvariant()) {
            Write-Log "Killing process using port $Port. PID: $portPid Name: $($proc.ProcessName)"

            & "$env:ComSpec" /d /c "taskkill /PID $portPid /T /F" 2>&1 | ForEach-Object {
                Write-Host $_
                Add-Content -LiteralPath $LogFile -Value $_
            }
        }
        else {
            throw "Port $Port is used by PID $portPid ($($proc.ProcessName)). Refusing to kill it automatically."
        }
    }
}

function Ensure-GitLocalExcludes {
    $gitPath = Join-Path $RepoPath ".git"

    if (-not (Test-Path -LiteralPath $gitPath)) {
        throw "Repo does not contain .git. Expected Git repo at: $RepoPath"
    }

    $infoPath = Join-Path $gitPath "info"
    $excludePath = Join-Path $infoPath "exclude"

    Ensure-Directory $infoPath

    if (-not (Test-Path -LiteralPath $excludePath)) {
        New-Item -ItemType File -Path $excludePath -Force | Out-Null
    }

    $existing = @(Get-Content -LiteralPath $excludePath -ErrorAction SilentlyContinue)

    $entries = @(
        "# Local automation excludes",
        "node_modules/",
        ".automation/",
        ".env",
        ".env.*",
        "!.env.example"
    )

    foreach ($entry in $entries) {
        if ($existing -notcontains $entry) {
            Add-Content -LiteralPath $excludePath -Value $entry
        }
    }
}

function Invoke-RobocopyMirror {
    param(
        [string]$SourceRoot,
        [string]$DestinationRoot
    )

    Write-Log "Mirroring zip contents into repo."
    Write-Log "Source: $SourceRoot"
    Write-Log "Destination: $DestinationRoot"

    $excludedDirs = @(
        ".git",
        "node_modules",
        ".automation"
    )

    $excludedFiles = @(
        ".env",
        ".env.local",
        ".env.development",
        ".env.production",
        ".env.test",
        ".env.staging"
    )

    $existingEnvFiles = @(
        Get-ChildItem -LiteralPath $DestinationRoot -Force -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -like ".env*" -and $_.Name -ne ".env.example"
            } |
            Select-Object -ExpandProperty Name
    )

    foreach ($envFile in $existingEnvFiles) {
        if ($excludedFiles -notcontains $envFile) {
            $excludedFiles += $envFile
        }
    }

    $args = @(
        $SourceRoot,
        $DestinationRoot,
        "/MIR",
        "/FFT",
        "/Z",
        "/R:2",
        "/W:1",
        "/NP"
    )

    if ($excludedDirs.Count -gt 0) {
        $args += "/XD"
        $args += $excludedDirs
    }

    if ($excludedFiles.Count -gt 0) {
        $args += "/XF"
        $args += $excludedFiles
    }

    Write-Log "Protected folders: $($excludedDirs -join ', ')"
    Write-Log "Protected env files: $($excludedFiles -join ', ')"

    & robocopy @args 2>&1 | ForEach-Object {
        Write-Host $_
        Add-Content -LiteralPath $LogFile -Value $_
    }

    $exitCode = $LASTEXITCODE

    if ($exitCode -ge 8) {
        throw "Robocopy failed with exit code $exitCode."
    }

    Write-Log "Robocopy completed with exit code $exitCode."
}

function Install-Dependencies {
    if ($CleanInstall -and (Test-Path -LiteralPath (Join-Path $RepoPath "package-lock.json"))) {
        Write-Log "CleanInstall enabled. Running npm ci."
        Invoke-CommandLogged -Command "npm ci" -WorkingDirectory $RepoPath
    }
    else {
        Write-Log "Running npm install."
        Invoke-CommandLogged -Command "npm install" -WorkingDirectory $RepoPath
    }
}

function Get-NextVersionNumber {
    Ensure-Directory $AutomationPath

    $current = 0

    if (Test-Path -LiteralPath $VersionFile) {
        $raw = Get-Content -LiteralPath $VersionFile -ErrorAction SilentlyContinue | Select-Object -First 1

        if ($raw -match "^\d+$") {
            $current = [int]$raw
        }
    }

    $next = $current + 1
    Set-Content -LiteralPath $VersionFile -Value $next

    return $next
}

function Commit-And-Push {
    Ensure-GitLocalExcludes

    Write-Log "Checking Git status."
    Invoke-CommandLogged -Command "git status --short" -WorkingDirectory $RepoPath

    Write-Log "Staging repo changes, excluding .automation from deployment commit."

    Invoke-CommandLogged -Command "git add -A -- ." -WorkingDirectory $RepoPath
    Invoke-CommandLogged -Command "git reset -q -- .automation" -WorkingDirectory $RepoPath

    Push-Location $RepoPath

    try {
        git diff --cached --quiet
        $diffExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($diffExitCode -eq 0) {
        Write-Log "No deployable Git changes detected after excluding .automation. Skipping commit and push."
        return
    }

    if ($diffExitCode -ne 1) {
        throw "Could not determine staged Git diff. git diff --cached --quiet exit code: $diffExitCode"
    }

    $version = Get-NextVersionNumber
    $message = "version $version"

    Invoke-CommandLogged -Command "git commit -m `"$message`"" -WorkingDirectory $RepoPath

    if ($NoGitPush) {
        Write-Log "NoGitPush enabled. Skipping git push."
    }
    else {
        Invoke-CommandLogged -Command "git push origin $Branch" -WorkingDirectory $RepoPath
    }
}

function Start-DevServer {
    Write-Log "Starting npm run dev as detached hidden process."

    if (Test-Path -LiteralPath $DevOutLog) {
        Clear-Content -LiteralPath $DevOutLog -ErrorAction SilentlyContinue
    }
    else {
        New-Item -ItemType File -Path $DevOutLog -Force | Out-Null
    }

    if (Test-Path -LiteralPath $DevErrLog) {
        Clear-Content -LiteralPath $DevErrLog -ErrorAction SilentlyContinue
    }
    else {
        New-Item -ItemType File -Path $DevErrLog -Force | Out-Null
    }

    $cmdArgs = "/d /c npm run dev 1>>`"$DevOutLog`" 2>>`"$DevErrLog`""

    $process = Start-Process `
        -FilePath "$env:ComSpec" `
        -ArgumentList $cmdArgs `
        -WorkingDirectory $RepoPath `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -LiteralPath $PidFile -Value $process.Id

    Start-Sleep -Seconds 2

    $check = Get-Process -Id $process.Id -ErrorAction SilentlyContinue

    if ($null -eq $check) {
        Write-Log "npm run dev process exited quickly. Check stderr log: $DevErrLog"
    }
    else {
        Write-Log "npm run dev started. Managed PID: $($process.Id)"
    }

    Write-Log "Dev stdout log: $DevOutLog"
    Write-Log "Dev stderr log: $DevErrLog"
}

function Acquire-DeployLock {
    Ensure-Directory $AutomationPath

    try {
        $stream = [System.IO.File]::Open(
            $LockFile,
            [System.IO.FileMode]::OpenOrCreate,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )

        $writer = New-Object System.IO.StreamWriter($stream)
        $writer.WriteLine("PID=$PID")
        $writer.WriteLine("Started=$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
        $writer.Flush()

        return @{
            Stream = $stream
            Writer = $writer
        }
    }
    catch {
        throw "Another deploy appears to be running. Lock file: $LockFile"
    }
}

function Release-DeployLock {
    param($Lock)

    if ($null -ne $Lock) {
        if ($null -ne $Lock.Writer) {
            $Lock.Writer.Dispose()
        }

        if ($null -ne $Lock.Stream) {
            $Lock.Stream.Dispose()
        }
    }

    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
}

function Main {
    Ensure-Directory $AutomationPath

    $lock = $null

    try {
        $lock = Acquire-DeployLock

        Write-Log "================ DEPLOY START ================"
        Write-Log "Repo path: $RepoPath"
        Write-Log "Downloads path: $DownloadsPath"

        if (-not (Test-Path -LiteralPath $RepoPath)) {
            throw "Repo path does not exist: $RepoPath"
        }

        if ([string]::IsNullOrWhiteSpace($ZipPath)) {
            $ZipPath = Find-LatestZip -Path $DownloadsPath
        }

        $ZipPath = [System.IO.Path]::GetFullPath($ZipPath)

        if (-not (Test-Path -LiteralPath $ZipPath)) {
            throw "Zip path does not exist: $ZipPath"
        }

        Write-Log "Selected zip: $ZipPath"

        Wait-FileStable -Path $ZipPath

        $fingerprint = Get-ZipFingerprint -Path $ZipPath

        if (-not $Force -and (Test-Path -LiteralPath $LastZipFile)) {
            $lastFingerprint = Get-Content -LiteralPath $LastZipFile -ErrorAction SilentlyContinue | Select-Object -First 1

            if ($lastFingerprint -eq $fingerprint) {
                Write-Log "This exact zip was already deployed. Use -Force to redeploy it."
                Write-Log "================ DEPLOY SKIPPED ================"
                return
            }
        }

        $stagingRoot = Join-Path $env:TEMP ("habits-planner-deploy-" + [guid]::NewGuid().ToString("N"))

        try {
            Ensure-Directory $stagingRoot

            Write-Log "Extracting zip to staging folder: $stagingRoot"
            Expand-Archive -LiteralPath $ZipPath -DestinationPath $stagingRoot -Force

            $sourceRoot = Find-ProjectRootInExtractedZip -ExtractedPath $stagingRoot

            Stop-ManagedDevServer
            Stop-ProcessUsingPort -Port $DevPort

            Invoke-RobocopyMirror -SourceRoot $sourceRoot -DestinationRoot $RepoPath

            Install-Dependencies

            Commit-And-Push

            Start-DevServer

            Set-Content -LiteralPath $LastZipFile -Value $fingerprint

            Write-Log "Deployment complete."
            Write-Log "================ DEPLOY END ================"
        }
        finally {
            if (Test-Path -LiteralPath $stagingRoot) {
                Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        Write-Log "DEPLOY FAILED: $($_.Exception.Message)"
        Write-Log "================ DEPLOY FAILED ================"
        throw
    }
    finally {
        Release-DeployLock -Lock $lock
    }
}

Main