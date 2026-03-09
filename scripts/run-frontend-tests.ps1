param(
  [string]$Filter = "",
  [switch]$Coverage,
  [switch]$UI,
  [switch]$Watch
)

if ($UI) {
  npm run test:ui
  exit $LASTEXITCODE
}

if ($Coverage) {
  npm run test:coverage
  Write-Host "Coverage report: coverage/frontend/index.html" -ForegroundColor Yellow
  exit $LASTEXITCODE
}

if ($Watch) {
  if ($Filter) {
    npm test -- $Filter
  } else {
    npm test
  }
  exit $LASTEXITCODE
}

if ($Filter) {
  npm run test:run -- $Filter
} else {
  npm run test:run
}

exit $LASTEXITCODE
