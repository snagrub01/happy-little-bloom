import { useState } from "react";
import { Bell, ShoppingBag, Car, Droplets, Clock, Baby } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface ReminderConfig {
  enabled: boolean;
  timing: string;
}

interface SecondaryReminderConfig {
  enabled: boolean;
  delayMinutes: number;
}

const Reminders = () => {
  const [bagIn, setBagIn] = useState<ReminderConfig>({ enabled: true, timing: "arriving" });
  const [secondaryReminder, setSecondaryReminder] = useState<SecondaryReminderConfig>({ enabled: false, delayMinutes: 3 });
  const [bagOut, setBagOut] = useState<ReminderConfig>({ enabled: true, timing: "5" });
  const [washReminder, setWashReminder] = useState<ReminderConfig>({ enabled: true, timing: "14" });

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
                  <p className="text-xs text-muted-foreground">
                    Remind when arriving at store
                  </p>
                </div>
              </div>
              <Switch
                checked={bagIn.enabled}
                onCheckedChange={(checked) => setBagIn({ ...bagIn, enabled: checked })}
              />
            </div>
            {bagIn.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">When:</span>
                <Select
                  value={bagIn.timing}
                  onValueChange={(v) => setBagIn({ ...bagIn, timing: v })}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Remind after getting home
                  </p>
                </div>
              </div>
              <Switch
                checked={bagOut.enabled}
                onCheckedChange={(checked) => setBagOut({ ...bagOut, enabled: checked })}
              />
            </div>
            {bagOut.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">After:</span>
                <Select
                  value={bagOut.timing}
                  onValueChange={(v) => setBagOut({ ...bagOut, timing: v })}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Keep bags clean & hygienic
                  </p>
                </div>
              </div>
              <Switch
                checked={washReminder.enabled}
                onCheckedChange={(checked) =>
                  setWashReminder({ ...washReminder, enabled: checked })
                }
              />
            </div>
            {washReminder.enabled && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Every:</span>
                <Select
                  value={washReminder.timing}
                  onValueChange={(v) =>
                    setWashReminder({ ...washReminder, timing: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
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

        {/* Info note */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-4 border border-border bg-accent/50">
            <p className="text-xs text-accent-foreground leading-relaxed">
              💡 <strong>How it works:</strong> Enable store alerts on the Stores tab. When you cross
              the geofence boundary near a selected store, you'll get a push notification to grab
              your bags. After arriving home, a timed reminder will prompt you to put them back in
              your vehicle.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Reminders;
