// Zoom commands using root font-size (proper approach for desktop app)
#[tauri::command]
pub async fn zoom_in(window: tauri::Window) -> Result<(), String> {
    // Scale via root font-size - affects all rem-based sizes
    window
        .eval(
            r#"
        (function() {
            const root = document.documentElement;
            const currentSize = parseFloat(root.style.fontSize || '16');
            const newSize = Math.min(currentSize * 1.1, 32); // Max 200%
            root.style.fontSize = newSize + 'px';
        })()
    "#,
        )
        .map_err(|e| format!("Failed to zoom in: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn zoom_out(window: tauri::Window) -> Result<(), String> {
    // Scale via root font-size - affects all rem-based sizes
    window
        .eval(
            r#"
        (function() {
            const root = document.documentElement;
            const currentSize = parseFloat(root.style.fontSize || '16');
            const newSize = Math.max(currentSize * 0.9, 8); // Min 50%
            root.style.fontSize = newSize + 'px';
        })()
    "#,
        )
        .map_err(|e| format!("Failed to zoom out: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn zoom_reset(window: tauri::Window) -> Result<(), String> {
    // Reset to default font size
    window
        .eval(
            r#"
        (function() {
            document.documentElement.style.fontSize = '16px';
        })()
    "#,
        )
        .map_err(|e| format!("Failed to reset zoom: {}", e))?;
    Ok(())
}
