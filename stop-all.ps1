# stop-all.ps1

Write-Output "Stopping Auto_Developer processes..."

# 1. Stop any active PowerShell Background Jobs (if run via start-all.ps1 in the same session)
$runningJobs = Get-Job -State Running -ErrorAction SilentlyContinue
if ($runningJobs) {
    Write-Output "Stopping background jobs..."
    $runningJobs | Stop-Job
    Get-Job -State Stopped | Remove-Job
    Write-Output "Background jobs stopped."
}

# 2. Kill any lingering processes on Port 3000 (Dashboard)
try {
    $dashboardProcessId = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction Stop).OwningProcess
    if ($dashboardProcessId) {
        Write-Output "Killing lingering Dashboard process (Port 3000, PID: $dashboardProcessId)..."
        Stop-Process -Id $dashboardProcessId -Force
        Write-Output "Dashboard process stopped."
    }
} catch {
    Write-Output "No active process found on Port 3000 (Dashboard)."
}

# 3. Kill any lingering processes on Port 8080 (Proxy)
try {
    $proxyProcessId = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction Stop).OwningProcess
    if ($proxyProcessId) {
        Write-Output "Killing lingering Proxy process (Port 8080, PID: $proxyProcessId)..."
        Stop-Process -Id $proxyProcessId -Force
        Write-Output "Proxy process stopped."
    }
} catch {
    Write-Output "No active process found on Port 8080 (Proxy)."
}

# 4. Kill any lingering processes on Port 2222 (SSH Server)
try {
    $sshProcessId = (Get-NetTCPConnection -LocalPort 2222 -ErrorAction Stop).OwningProcess
    if ($sshProcessId) {
        Write-Output "Killing lingering SSH Server process (Port 2222, PID: $sshProcessId)..."
        Stop-Process -Id $sshProcessId -Force
        Write-Output "SSH Server process stopped."
    }
} catch {
    Write-Output "No active process found on Port 2222 (SSH Server)."
}

Write-Output "All Auto_Developer instances have been successfully deactivated!"
