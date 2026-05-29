import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "battery_opt_prompt_dismissed";

const BatteryOptimizationPrompt = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleOpenSettings = () => {
    NativeSettings.openAndroid({
      option: AndroidSettings.RequestIgnoreBatteryOptimizations,
    });
    dismissPrompt();
  };

  const dismissPrompt = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enable Background Notifications</DialogTitle>
          <DialogDescription>
            To receive geofence and reminder notifications even when your screen
            is locked, please allow Bag Au Pair to ignore battery optimization.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Without this permission, Android may pause the app when the screen is
          off, causing missed arrival reminders and bag alerts.
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="outline" onClick={dismissPrompt}>
            Not Now
          </Button>
          <Button onClick={handleOpenSettings}>
            Open Battery Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatteryOptimizationPrompt;
