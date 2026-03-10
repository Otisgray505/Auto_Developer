# Start Proxy in the background
Start-Job -Name "AutoOrchProxy" -ScriptBlock {
    Set-Location "$env:GITHUB_WORKSPACE\apps\proxy"
    npm run start
}

# Start Dashboard in the background
Start-Job -Name "AutoOrchDashboard" -ScriptBlock {
    Set-Location "$env:GITHUB_WORKSPACE\apps\dashboard"
    npm run dev
}

Write-Output "Both Proxy (Port 8080) and Dashboard (Port 3000) have been started as background jobs!"
