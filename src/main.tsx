import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { requestNotificationPermission } from "./lib/notifications";

// PWA-only: ask for notification permission early so notifications can fire.
requestNotificationPermission().catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
