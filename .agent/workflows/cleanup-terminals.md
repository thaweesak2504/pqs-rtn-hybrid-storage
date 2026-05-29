# Workflow: Cleanup Terminals

This workflow cleans up all stuck terminal processes for the project.

## Steps

1. **Kill running `npm start`**
   // turbo
   Find and kill the Node/NPM server.

2. **Kill running `tauri dev`**
   // turbo
   Find and kill the Tauri Dev process.

3. **Verify clean state**
   // turbo
   Check if the port 1420 is free.
