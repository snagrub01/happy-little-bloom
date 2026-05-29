import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { requestNotificationPermission } from "./lib/notifications";
import { initialize as initializeRadar } from "./lib/native-geofence";

// Background geolocation is handled entirely by Radar's native SDK.
// Do NOT start any JS-side geofence watcher, visibilitychange, or focus
// listeners here — those caused the WebView to drive geofencing and broke
// background reliability.

// Foreground-only: ask for notification permission so manual/native-fired
// notifications can display. Fire-and-forget; never blocks React mount.
requestNotificationPermission().catch(() => {});

// Start Radar native background tracking + geofence event listener.
initializeRadar().catch((e) => console.error("[main] Radar init failed", e));

createRoot(document.getElementById("root")!).render(<App />);
