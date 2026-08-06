param(
    [string]$Filter = "",
    [switch]$NoCapture
)

$ErrorActionPreference = "Stop"
$originalLocation = Get-Location
$tauriDirectory = Join-Path $PSScriptRoot "..\src-tauri"

try {
    Set-Location $tauriDirectory

    $testArgs = @("test", "--all-targets", "--all-features")
    if ($Filter) {
        $testArgs += $Filter
    }
    if ($NoCapture) {
        $testArgs += @("--", "--nocapture")
    }

    & cargo @testArgs
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Set-Location $originalLocation
}
