import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import { loadStoreData } from "@/lib/store-persistence";
import { startGeofenceWatching, stopGeofenceWatching } from "@/lib/geofence";
import Index from "./pages/Index.tsx";
import Stores from "./pages/Stores.tsx";
import ShoppingList from "./pages/ShoppingList.tsx";
import Reminders from "./pages/Reminders.tsx";
import Donate from "./pages/Donate.tsx";
import Install from "./pages/Install.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Start the geofence watcher once on app mount.
    // On native (Capacitor) this uses background-geolocation and keeps
    // running when the app is backgrounded or the screen is locked, so we
    // don't need the visibilitychange/focus restart dance anymore.
    const { stores, enabled } = loadStoreData();
    const enabledStores = stores.filter((s) => enabled.has(s.id));
    startGeofenceWatching(enabledStores);

    return () => {
      stopGeofenceWatching();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/list" element={<ShoppingList />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
