import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import BatteryOptimizationPrompt from "@/components/BatteryOptimizationPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index.tsx";
import Stores from "./pages/Stores.tsx";
import ShoppingList from "./pages/ShoppingList.tsx";
import Reminders from "./pages/Reminders.tsx";
import Donate from "./pages/Donate.tsx";
import Install from "./pages/Install.tsx";
import NotFound from "./pages/NotFound.tsx";
import { runOnOpenProximityCheck } from "@/lib/on-open-proximity";
import { ensureWashReminderScheduled } from "@/lib/notifications";
import { loadReminderSettings } from "@/lib/reminder-persistence";

const queryClient = new QueryClient();

const App = () => {
  // Run once per app open: check proximity to enabled stores and reschedule
  // the wash reminder if missing. Background geofence events are handled by
  // Radar's native SDK separately (see main.tsx).
  useEffect(() => {
    runOnOpenProximityCheck().catch((e) =>
      console.warn("[app] on-open proximity check failed", e)
    );
    const settings = loadReminderSettings();
    if (settings.washReminder.enabled) {
      const days = parseInt(settings.washReminder.timing, 10) || 14;
      ensureWashReminderScheduled(days).catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <BatteryOptimizationPrompt />
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
