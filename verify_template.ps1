$ErrorActionPreference = "Stop"
try {
    Write-Host "Logging in..."
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/sign-in" -Method Post -Body (@{usernameOrEmail="admin";password="admin"} | ConvertTo-Json) -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "Login successful. Token: $($token.Substring(0, 10))..."

    $outFile = "test_download.xlsx"
    if (Test-Path $outFile) { Remove-Item $outFile }

    Write-Host "Downloading template..."
    Invoke-RestMethod -Uri "http://localhost:8080/api/admin/bulk-upload/template?type=students" -Method Get -Headers @{Authorization="Bearer $token"} -OutFile $outFile

    if (Test-Path $outFile) {
        $len = (Get-Item $outFile).Length
        if ($len -gt 0) {
            Write-Host "SUCCESS: File downloaded ($len bytes)."
            Remove-Item $outFile
        } else {
            Write-Error "FAILURE: File is empty."
        }
    } else {
        Write-Error "FAILURE: File not found."
    }
} catch {
    Write-Error "ERROR: $_"
    exit 1
}
