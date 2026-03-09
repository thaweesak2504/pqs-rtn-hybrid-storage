Write-Host "Running frontend integration tests..." -ForegroundColor Cyan

npm run test:integration

if ($LASTEXITCODE -ne 0) {
  Write-Host "Integration tests failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Integration tests complete." -ForegroundColor Green
