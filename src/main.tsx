import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { appWindow } from "@tauri-apps/api/window";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Show window after React mount + first paint — eliminates all flash
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    appWindow.show().then(() => {
      // Trigger fade-in after window is visible
      document.getElementById("root")?.classList.add("app-ready");
    });
  });
});
