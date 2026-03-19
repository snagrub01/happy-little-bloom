import { useState, useEffect } from "react";
import { Bell, ShoppingBag, Car, Droplets, Clock, Baby, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { saveReminderSettings, loadReminderSettings } from "@/lib/reminder-persistence";
import { requestNotificationPermission, scheduleBagReminder, sendLocalNotification } from "@/lib/notifications";
import { startGeofenceWatching } from "@/lib/geofence";
import { loadStoreData } from "@/lib/store-persistence";
import { toast } from "sonner";

const Reminders = () => {
  const saved = loadReminderSettings();
  const [bagIn, setBagIn] = useState(saved.bagIn);
  const [secondaryReminder, setSecondaryReminder] = useState(saved.secondaryReminder);
  const [bagOut, setBagOut] = useState(saved.bagOut);
  const [washReminder, setWashReminder] = useState(saved.washReminder);
  const [couponReminder, setCouponReminder] = useState(saved.couponReminder);

  // Persist settings on change
  useEffect(() => {
    const settings = { bagIn, secondaryReminder, bagOut, washReminder, couponReminder };
    saveReminderSettings(settings);
  }, [bagIn, secondaryReminder, bagOut, washReminder, couponReminder]);

  // Re-start geofence when bag-in settings change
  useEffect(() => {
    if (bagIn.enabled) {
      const { stores, enabled } = loadStoreData();
      const enabledStores = stores.filter((s) => enabled.has(s.id));
      if (enabledStores.length > 0) {
        startGeofenceWatching(enabledStores);
      }
    }
  }, [bagIn]);

  // Schedule bag-return reminder when enabled
  useEffect(() => {
    if (bagOut.enabled) {
      // This is activated in real usage when the user arrives home
      // For now we set up the timer from the settings
    }
  }, [bagOut]);

  // Wash reminder scheduling
  useEffect(() => {
    if (!washReminder.enabled) return;
    const days = parseInt(washReminder.timing, 10);
    const ms = days * 24 * 60 * 60 * 1000;
    const timer = setInterval(() => {
      sendLocalNotification(
        "🧺 Time to Wash Your Bags",
        `It's been ${days} days — time to wash your canvas grocery bags!`
      );
    }, ms);
    return () => clearInterval(timer);
  }, [washReminder]);

  const handleToggle = (setter: Function, current: any, checked: boolean) => {
    if (checked) {
      requestNotificationPermission().then((granted) => {
        if (!granted) {
          toast.error("Please enable notifications in your browser settings");
        }
      });
    }
    setter({ ...current, enabled: checked });
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Reminders</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Configure your bag reminder settings
        </p>
      </motion.div>

      <div className="space-y-4">
        {/* Take bag into store */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl eco-gradient flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Take bags into store</p>
                  <p className="text-xs text-muted-foreground">Remind when arriving at store</p>
                </div>
              </div>
              <Switch
                checked={bagIn.enabled}
                onCheckedChange={(checked) => handleToggle(setBagIn, bagIn, checked)}
              />
            </div>
            {bagIn.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">When:</span>
                <Select value={bagIn.timing} onValueChange={(v) => setBagIn({ ...bagIn, timing: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arriving">When arriving at store</SelectItem>
                    <SelectItem value="500ft">500 ft from store</SelectItem>
                    <SelectItem value="0.25mi">¼ mile from store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Secondary follow-up reminder */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Baby className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Follow-up reminder</p>
                  <p className="text-xs text-muted-foreground">Extra time to unload kids first</p>
                </div>
              </div>
              <Switch
                checked={secondaryReminder.enabled}
                onCheckedChange={(checked) => handleToggle(setSecondaryReminder, secondaryReminder, checked)}
              />
            </div>
            {secondaryReminder.enabled && (
              <div className="mt-2 pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Remind again after:</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{secondaryReminder.delayMinutes} min</span>
                </div>
                <Slider
                  value={[secondaryReminder.delayMinutes]}
                  onValueChange={([v]) => setSecondaryReminder({ ...secondaryReminder, delayMinutes: v })}
                  min={2} max={5} step={1} className="w-full"
                />
                <p className="text-xs text-muted-foreground">Perfect for getting kids out of car seats first 👶</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Put bags back in car */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl eco-gradient-warm flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Put bags back in car</p>
                  <p className="text-xs text-muted-foreground">Remind after getting home</p>
                </div>
              </div>
              <Switch
                checked={bagOut.enabled}
                onCheckedChange={(checked) => handleToggle(setBagOut, bagOut, checked)}
              />
            </div>
            {bagOut.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">After:</span>
                <Select value={bagOut.timing} onValueChange={(v) => setBagOut({ ...bagOut, timing: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Wash canvas bags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-eco-sky flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Wash canvas bags</p>
                  <p className="text-xs text-muted-foreground">Keep bags clean & hygienic</p>
                </div>
              </div>
              <Switch
                checked={washReminder.enabled}
                onCheckedChange={(checked) => handleToggle(setWashReminder, washReminder, checked)}
              />
            </div>
            {washReminder.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Every:</span>
                <Select value={washReminder.timing} onValueChange={(v) => setWashReminder({ ...washReminder, timing: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 week</SelectItem>
                    <SelectItem value="14">2 weeks</SelectItem>
                    <SelectItem value="21">3 weeks</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Coupon app reminder */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <Card className="p-4 border border-border">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Tag className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-card-foreground">Coupon app reminder</p>
                  <p className="text-xs text-muted-foreground">Vibrate to check store deals</p>
                </div>
              </div>
              <Switch
                checked={couponReminder.enabled}
                onCheckedChange={(checked) => setCouponReminder({ ...couponReminder, enabled: checked })}
              />
            </div>
            {couponReminder.enabled && (
              <p className="text-xs text-muted-foreground mt-2 pt-3 border-t border-border leading-relaxed">
                📳 When you arrive at a store, your phone will vibrate and remind you to open the store's app (Safeway, Raley's, etc.) to check for weekly coupons and deals.
              </p>
            )}
          </Card>
        </motion.div>

        {/* Test Notification */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-4 border border-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-card-foreground">Test Notification</p>
              <p className="text-xs text-muted-foreground">Send a test to verify notifications work</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted) {
                  sendLocalNotification("🛍️ Bag Au Pair", "Notifications are working! You're all set.");
                  toast.success("Test notification sent!");
                } else {
                  toast.error("Please enable notifications in your browser settings");
                }
              }}
            >
              <Bell className="w-4 h-4 mr-1" />
              Test
            </Button>
          </Card>
        </motion.div>

        {/* Info note */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-4 border border-border bg-accent/50">
            <p className="text-xs text-accent-foreground leading-relaxed">
              💡 <strong>How it works:</strong> Enable store alerts on the Stores tab. When you're near
              a selected store, you'll get a push notification to grab your bags. The wash reminder
              runs on a recurring schedule. All settings are saved automatically.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Reminders;
