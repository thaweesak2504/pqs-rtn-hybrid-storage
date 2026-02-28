# Troubleshooting: Terminal Hanging in Antigravity (Windows)

This document provides strategies to prevent and resolve issues where terminal commands (like `git status` or `git push`) hang indefinitely when executed by the Agent.

## 1. Root Causes
*   **Interactive Prompts**: Commands like `git push` might trigger hidden credential prompts (Username/Password/SSH Passphrase) that the Agent cannot see.
*   **Orphaned Processes**: Residual `conhost.exe`, `git.exe`, or `powershell.exe` processes from previous failed/interrupted tasks can lock resources.
*   **File Locking**: Windows `index.lock` files or handle locks can prevent subsequent commands from executing.

## 2. IDE Configuration (Fix at Source)
Modify `settings.json` (via `Ctrl+Shift+P` > `Open User Settings (JSON)`) to use a more stable automation profile.

```json
{
  "terminal.integrated.automationProfile.windows": {
    "path": "C:\\Windows\\System32\\cmd.exe"
  },
  "terminal.integrated.enablePersistentSessions": false
}
```
*   **Why?**: `cmd.exe` is more lightweight than PowerShell and lacks complex profile loading that often causes "hangs" in background tasks.
*   **Why?**: Disabling `PersistentSessions` ensure a clean slate for every project load, preventing stale terminal states.

## 3. Git Maintenance
Run these commands to minimize background prompts and locking issues:
```powershell
# Disable GUI credential prompts that hide behind windows
git config --global core.askpass ""

# Set a timeout for file locks (prevents indefinite hanging)
git config --global core.locktimeout 1000
```

## 4. Manual Cleanup Procedure
If commands still hang:
1.  **Stop conhost.exe**: Open Task Manager and terminate background `conhost.exe` processes (the ones without visible windows).
2.  **Run Cleanup Script**: Use the local repository script:
    ```powershell
    ./scripts/cleanup.ps1
    ```
3.  **Restart IDE**: A full restart of Antigravity is often the cleanest way to reset the terminal handle.

## 5. User-Reported Success Patterns (2026-02-28)
Recent feedback confirms highly stable terminal operations with the following habits:
*   **Terminal Reset on Start**: Closing and reopening the Terminal once at the start of an IDE session ensures a fresh, non-hanging state.
*   **Language/Keyboard Support**: Using the keyboard in "Thai" mode while the Agent works does not cause interference or hangs in current versions.
*   **Overall Flow**: Terminal commands (Git, etc.) are currently performing fluidly without manual intervention.
