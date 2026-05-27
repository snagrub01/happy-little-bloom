import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAppServices } from "./lib/startup";

// Kick off native services (background geolocation + notifications) BEFORE
// React mounts. This guarantees the watcher is registered at app process
// start, not when a particular screen happens to load.
initAppServices();

createRoot(document.getElementById("root")!).render(<App />);
