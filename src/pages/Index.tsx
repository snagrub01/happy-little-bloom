import { ShoppingBag, MapPin, ListChecks, Sparkles, Leaf, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadStoreData } from "@/lib/store-persistence";
import { loadReminderSettings } from "@/lib/reminder-persistence";

const quickActions = [
  {
    icon: MapPin,
    label: "Find Stores",
    desc: "Nearby grocery stores",
    path: "/stores",
    gradient: "eco-gradient",
  },
  {
    icon: ListChecks,
    label: "Shopping List",
    desc: "Manage your items",
    path: "/list",
    gradient: "eco-gradient-warm",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-6 h-6 text-primary" />
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">
            Bag Au Pair
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Never forget your bags again
        </h1>
        <p className="text-muted-foreground mt-1">
          Eco-friendly reminders for a greener you 🌿
        </p>
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="eco-gradient p-6 mb-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">
                Status
              </p>
              <p className="text-primary-foreground text-lg font-bold">
                Bags ready to go!
              </p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">
                Set up store alerts to get started
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold mb-3 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] border border-border"
              onClick={() => navigate(action.path)}
            >
              <div
                className={`w-10 h-10 rounded-xl ${action.gradient} flex items-center justify-center mb-3`}
              >
                <action.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="font-semibold text-sm text-card-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-3 text-foreground">Eco Tips</h2>
        <Card className="p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-eco-sun" />
            </div>
            <div>
              <p className="font-medium text-sm text-card-foreground">Wash your canvas bags</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clean your reusable bags every 2 weeks to keep them fresh and hygienic. We'll remind you! 🧼
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Index;
