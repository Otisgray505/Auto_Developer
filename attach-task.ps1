param(
    [Parameter(Mandatory = $true)]
    [string]$TaskId,

    [string]$BaseUrl = "ws://127.0.0.1:8080"
)

$ScriptPath = $PSScriptRoot
if (-not $ScriptPath) {
    $ScriptPath = (Get-Location).Path
}

node "$ScriptPath\apps\proxy\scripts\attach-task.js" $TaskId $BaseUrl
