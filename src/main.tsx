import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { requestNotificationPermission } from "./lib/notifications";

// Background geolocation is handled entirely by the native Android layer.
// Do NOT start any JS-side geofence watcher, visibilitychange, or focus
// listeners here — those caused the WebView to drive geofencing and broke
// background reliability.

// Foreground-only: ask for notification permission so manual/native-fired
// notifications can display. Fire-and-forget; never blocks React mount.
requestNotificationPermission().catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
