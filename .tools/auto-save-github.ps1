param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Continue'
$logFile = Join-Path $ProjectRoot '.git\github-auto-save.log'
$ignoredPath = '[\\/](?:\.git|node_modules|dist)(?:[\\/]|$)'

function Write-Log([string]$Message) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Message" | Add-Content -LiteralPath $logFile
}

function Invoke-Git([string[]]$Arguments) {
  & git -c "safe.directory=$ProjectRoot" @Arguments 2>&1 | ForEach-Object {
    Write-Log $_.ToString()
  }
  return $LASTEXITCODE
}

$watcher = [System.IO.FileSystemWatcher]::new($ProjectRoot, '*')
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName'

$script:pending = $false
$script:lastChange = Get-Date
$onChange = [System.IO.FileSystemEventHandler]{
  param($sender, $event)
  if ($event.FullPath -notmatch $ignoredPath) {
    $script:pending = $true
    $script:lastChange = Get-Date
  }
}
$watcher.add_Changed($onChange)
$watcher.add_Created($onChange)
$watcher.add_Deleted($onChange)
$watcher.add_Renamed([System.IO.RenamedEventHandler]{
  param($sender, $event)
  if ($event.FullPath -notmatch $ignoredPath) {
    $script:pending = $true
    $script:lastChange = Get-Date
  }
})
$watcher.EnableRaisingEvents = $true

Write-Log 'GitHub auto-save watcher started.'
while ($true) {
  Start-Sleep -Seconds 2
  if (-not $script:pending -or ((Get-Date) - $script:lastChange).TotalSeconds -lt 8) { continue }

  $script:pending = $false
  if ((Invoke-Git @('add', '-A')) -ne 0) {
    Write-Log 'Staging failed; will retry after the next change.'
    continue
  }
  & git -c "safe.directory=$ProjectRoot" diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { continue }
  if ($LASTEXITCODE -ne 1) {
    Write-Log 'Could not inspect staged changes.'
    continue
  }

  $message = "Auto-save: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  if ((Invoke-Git @('commit', '-m', $message)) -ne 0) {
    Write-Log 'Commit failed; changes remain staged.'
    continue
  }
  if ((Invoke-Git @('push')) -eq 0) {
    Write-Log 'Saved to GitHub.'
  } else {
    Write-Log 'Commit was saved locally, but GitHub push failed. Run git pull/reconcile before the next push.'
  }
}
