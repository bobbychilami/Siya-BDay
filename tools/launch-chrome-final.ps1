$ErrorActionPreference = 'Stop'

$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $Chrome)) { throw "Chrome not found at $Chrome" }

$Port = 9222
# find a free port
$used = 0
while ($used -eq 0) {
  try {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $l.Start()
    $l.Stop()
    $used = 1
  } catch {
    $Port += 1
    if ($Port -gt 65000) { throw "no ports" }
  }
}

$ProfileDir = Join-Path $env:TEMP "siya-chrome-prof-$Port"
$StdOut = Join-Path $env:TEMP "siya-chrome-stdout-$Port.log"
$StdErr = Join-Path $env:TEMP "siya-chrome-stderr-$Port.log"
$WsEnvPath = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "chrome-ws.env"
$WsLogPath = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "chrome-ws.log"

# clean previous
@($StdOut, $StdErr) | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Force } }

$p = Start-Process -FilePath $Chrome -PassThru -NoNewWindow -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr -ArgumentList @(
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--force-color-profile=srgb',
  "--user-data-dir=$ProfileDir",
  "--remote-debugging-port=$Port",
  'about:blank'
)

# wait for devtools endpoint via HTTP polling (fastest reliable signal)
$deadline = [Diagnostics.Stopwatch]::StartNew()
$wsUrl = $null
while ($deadline.ElapsedMilliseconds -lt 15000) {
  Start-Sleep -Milliseconds 80
  if ($p.HasExited) { break }
  try {
    $resp = [System.Net.WebRequest]::Create("http://127.0.0.1:$Port/json/version").GetResponse()
    $txt = [System.IO.StreamReader]::new($resp.GetResponseStream()).ReadToEnd()
    if ($txt -match '"webSocketDebuggerUrl"\s*:\s*"([^"]+)"') {
      $wsUrl = $Matches[1]
      break
    }
  } catch {}
}
if (-not $wsUrl) {
  @($StdOut, $StdErr) | ForEach-Object { if (Test-Path $_) { Get-Content $_ -Raw -ErrorAction SilentlyContinue } } | Out-Null
  $p | Stop-Process -Force -ErrorAction SilentlyContinue
  throw "NO_WS"
}

# write env marker + log, leave Chrome running
Set-Content -Path $WsEnvPath -Value "DEVTOOLS_READY=1" -NoNewline -ErrorAction Stop
Set-Content -Path $WsLogPath -Value "WS_URL=$wsUrl" -NoNewline -Force -ErrorAction Stop

# keep Chrome running after this script returns; do not terminate it
