import { useState, useEffect } from "react";
import { Download, Bell, CheckCircle2, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/lib/notifications";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    if ("Notification" in window && Notification.permission === "granted") {
      setNotifGranted(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info("Open your browser menu and tap 'Add to Home Screen'");
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      toast.success("Bag Au Pair installed!");
    }
    setDeferredPrompt(null);
  };

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      toast.success("Notifications enabled!");
    } else {
      toast.error("Notifications blocked. Enable them in your browser settings.");
    }
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Install Bag Au Pair</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Get the full experience with home screen access and notifications
        </p>
      </motion.div>

      <div className="space-y-4">
        {/* Install card - centered at top */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center">
          <Card className="p-5 border border-border w-full max-w-sm text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl eco-gradient flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="font-semibold text-foreground">Install to Home Screen</h2>
              <p className="text-sm text-muted-foreground">
                Add Bag Au Pair to your home screen for quick access — works like a native app.
              </p>
              {installed ? (
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Installed!
                </div>
              ) : (
                <Button onClick={handleInstall} className="eco-gradient border-0">
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* iPhone notice - right below install */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex justify-center">
          <Card className="p-4 border border-border bg-accent/50 w-full max-w-sm">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">📱 iPhone users:</strong> Tap the Share button in Safari, then "Add to Home Screen" to install.
            </p>
          </Card>
        </motion.div>

        {/* Notifications card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 border border-border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground mb-1">Enable Notifications</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Get reminders to take your bags, put them back, and wash canvas bags on schedule.
                </p>
                {notifGranted ? (
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Notifications enabled
                  </div>
                ) : (
                  <Button onClick={handleNotifications} variant="outline">
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Notifications
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Install;
