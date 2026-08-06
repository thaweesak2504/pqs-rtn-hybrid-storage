# Run And Verify The Project

Run npm commands from the repository root. Rust commands may be run from `src-tauri/` or with `--manifest-path`.

## Requirements

- Windows with the Tauri v1 build prerequisites
- Node.js 20 or later and npm
- Stable Rust toolchain with Cargo

## Install

```powershell
npm ci
```

`src-tauri/Cargo.lock` is tracked so Rust dependency resolution stays reproducible.

## Development

```powershell
# Full desktop application
npm run tauri:dev

# Frontend-only Vite server on port 1420
npm run dev
```

If port 1420 is occupied by a previous project process:

```powershell
npm run clean
```

The cleanup script only stops the known application process and the listening process that owns port 1420.

## Build

```powershell
# Frontend production bundle
npm run build

# Desktop bundle/installer
npm run tauri:build
```

Tauri output is generated under `src-tauri/target/` and frontend output under `dist/`; both are ignored build artifacts.

## Frontend Checks

```powershell
npx tsc --noEmit
npx eslint src --max-warnings=0
npm run test:run
npm run test:integration
npm run test:coverage
npm run build
```

Convenience wrappers:

```powershell
.\scripts\run-frontend-tests.ps1
.\scripts\run-integration-tests.ps1
```

## Rust Checks

```powershell
Set-Location src-tauri
cargo test --all-targets --all-features
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
Set-Location ..
```

The supported wrapper is:

```powershell
.\scripts\run-rust-tests.ps1
```

## Common Problems

- Missing `package.json`: return to the repository root before running npm.
- Port 1420 already in use: run `npm run clean`, then retry.
- Rust linker/build-tool errors: install the Windows C++ build tools required by Tauri v1.
- Stale generated output: remove `dist/` or `src-tauri/target/`; never delete source data or AppData as part of a build cleanup.
