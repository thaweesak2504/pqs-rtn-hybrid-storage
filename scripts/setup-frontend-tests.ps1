Write-Host "Setting up frontend testing infrastructure..." -ForegroundColor Cyan

npm install --save-dev `
  vitest `
  @testing-library/react `
  @testing-library/jest-dom `
  @testing-library/user-event `
  jsdom `
  @vitest/coverage-v8 `
  @vitest/ui

New-Item -ItemType Directory -Force -Path "src/test" | Out-Null
New-Item -ItemType Directory -Force -Path "src/test/utils" | Out-Null
New-Item -ItemType Directory -Force -Path "coverage/frontend" | Out-Null

Write-Host "Frontend testing setup complete." -ForegroundColor Green
Write-Host "Run tests with: npm run test:run" -ForegroundColor Yellow
