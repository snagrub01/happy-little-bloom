import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index.tsx";
import Stores from "./pages/Stores.tsx";
import ShoppingList from "./pages/ShoppingList.tsx";
import Reminders from "./pages/Reminders.tsx";
import Donate from "./pages/Donate.tsx";
import Install from "./pages/Install.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
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

export default App;
