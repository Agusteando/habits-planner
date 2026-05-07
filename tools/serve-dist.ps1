$ErrorActionPreference = 'Stop'

$DistPath = Join-Path $PSScriptRoot '..\dist'
if (-not (Test-Path (Join-Path $DistPath 'index.html'))) {
  throw "Could not find dist\index.html. Extract the zip to a normal folder first, then run START_HABIT_PLANNER.cmd from that folder."
}
$Root = (Resolve-Path $DistPath).Path

function Get-FreePort([int]$StartPort) {
  for ($port = $StartPort; $port -lt ($StartPort + 100); $port++) {
    try {
      $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
      $probe.Start()
      $probe.Stop()
      return $port
    } catch {
      continue
    }
  }
  throw "No free local port found near $StartPort."
}

function Get-MimeType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8'; break }
    '.css'  { 'text/css; charset=utf-8'; break }
    '.js'   { 'application/javascript; charset=utf-8'; break }
    '.json' { 'application/json; charset=utf-8'; break }
    '.svg'  { 'image/svg+xml'; break }
    '.png'  { 'image/png'; break }
    '.jpg'  { 'image/jpeg'; break }
    '.jpeg' { 'image/jpeg'; break }
    '.webp' { 'image/webp'; break }
    '.ico'  { 'image/x-icon'; break }
    '.wav'  { 'audio/wav'; break }
    '.mp3'  { 'audio/mpeg'; break }
    default { 'application/octet-stream'; break }
  }
}

$port = Get-FreePort 5173
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
$url = "http://localhost:$port/"

Write-Host "Habit Planner RPG is running at $url"
Write-Host "Close this window or press Ctrl+C to stop it."
Start-Process $url | Out-Null

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq '') { break }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      $parts = $requestLine.Split(' ')
      $target = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $pathOnly = $target.Split('?')[0]
      $pathOnly = [System.Uri]::UnescapeDataString($pathOnly)
      if ($pathOnly -eq '/') { $pathOnly = '/index.html' }

      $relative = $pathOnly.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $candidate = Join-Path $Root $relative
      $resolved = $null
      if (Test-Path $candidate -PathType Leaf) {
        $resolved = (Resolve-Path $candidate).Path
      }

      if ($null -eq $resolved -or -not $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $resolved = Join-Path $Root 'index.html'
      }

      $body = [System.IO.File]::ReadAllBytes($resolved)
      $mime = Get-MimeType $resolved
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
    } catch {
      try {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Server error")
        $header = "HTTP/1.1 500 Internal Server Error`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($msg, 0, $msg.Length)
      } catch {}
      Write-Host "Request error: $($_.Exception.Message)"
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
