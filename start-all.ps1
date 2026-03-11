$ScriptPath = $PSScriptRoot
if (-not $ScriptPath) {
    $ScriptPath = (Get-Location).Path
}

# Start Proxy in the background
Start-Job -Name "AutoOrchProxy" -ScriptBlock {
    param($Path)
    Set-Location "$Path\apps\proxy"
    npm run start
} -ArgumentList $ScriptPath

# Start Dashboard in the background when the submodule/worktree is available
Start-Job -Name "AutoOrchDashboard" -ScriptBlock {
    param($Path)
    Set-Location "$Path\apps\dashboard"
    npm run dev
} -ArgumentList $ScriptPath

Write-Output "Auto_Developer platform services started: Proxy (8080) and Dashboard (3000)."
Write-Output "Use .\\attach-task.ps1 <taskId> to mirror or control a delegated CLI session from the current terminal."
