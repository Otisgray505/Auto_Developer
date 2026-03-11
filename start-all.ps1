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

# Start Dashboard in the background
Start-Job -Name "AutoOrchDashboard" -ScriptBlock {
    param($Path)
    Set-Location "$Path\apps\dashboard"
    npm run dev
} -ArgumentList $ScriptPath

Write-Output "Both Proxy (Port 8080) and Dashboard (Port 3000) have been started as background jobs!"
