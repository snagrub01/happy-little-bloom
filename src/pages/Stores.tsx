import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Loader2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { geocodeZipCode, findNearbyStores, type StoreResult } from "@/lib/stores-api";
import GeofenceMap from "@/components/GeofenceMap";
import { saveStoreData, loadStoreData, saveStoreGeofences, loadStoreGeofences } from "@/lib/store-persistence";
import { startGeofenceWatching } from "@/lib/geofence";
import { requestNotificationPermission } from "@/lib/notifications";

const DEFAULT_GEOFENCE_FEET = 250;

const Stores = () => {
  const saved = loadStoreData();
  const [zipCode, setZipCode] = useState(saved.zip);
  const [radius, setRadius] = useState([saved.radius]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreResult[]>(saved.stores);
  const [searched, setSearched] = useState(saved.stores.length > 0);
  const [enabledStores, setEnabledStores] = useState<Set<string>>(saved.enabled);
  const [storeGeofences, setStoreGeofences] = useState<Map<string, number>>(loadStoreGeofences);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStore, setDialogStore] = useState<StoreResult | null>(null);
  const [dialogFeet, setDialogFeet] = useState([DEFAULT_GEOFENCE_FEET]);
  const [isEditing, setIsEditing] = useState(false);

  const filteredStores = stores.filter(
    (s) => parseFloat(s.distance) <= radius[0]
  );

  // Persist whenever state changes
  useEffect(() => {
    saveStoreData(zipCode, radius[0], stores, enabledStores);
  }, [zipCode, radius, stores, enabledStores]);

  useEffect(() => {
    saveStoreGeofences(storeGeofences);
  }, [storeGeofences]);

  // Start geofence watching when enabled stores change
  useEffect(() => {
    const enabled = stores.filter((s) => enabledStores.has(s.id));
    if (enabled.length > 0) {
      startGeofenceWatching(enabled);
    }
  }, [enabledStores, stores]);

  const openGeofenceDialog = (store: StoreResult, editing: boolean) => {
    setDialogStore(store);
    setIsEditing(editing);
    const existing = storeGeofences.get(store.id);
    setDialogFeet([existing ?? DEFAULT_GEOFENCE_FEET]);
    setDialogOpen(true);
  };

  const handleStoreClick = (store: StoreResult) => {
    if (enabledStores.has(store.id)) {
      // Already enabled — open edit dialog
      openGeofenceDialog(store, true);
    } else {
      // New — open setup dialog
      openGeofenceDialog(store, false);
    }
  };

  const handleEnableGeofence = () => {
    if (!dialogStore) return;
    const id = dialogStore.id;

    setStoreGeofences((prev) => {
      const next = new Map(prev);
      next.set(id, dialogFeet[0]);
      return next;
    });

    setEnabledStores((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    requestNotificationPermission();
    setDialogOpen(false);
    toast.success(`Geofence set for ${dialogStore.name} at ${dialogFeet[0]} ft`);
  };

  const handleUpdateGeofence = () => {
    if (!dialogStore) return;

    setStoreGeofences((prev) => {
      const next = new Map(prev);
      next.set(dialogStore.id, dialogFeet[0]);
      return next;
    });

    setDialogOpen(false);
    toast.success(`Geofence updated to ${dialogFeet[0]} ft`);
  };

  const handleDisableGeofence = () => {
    if (!dialogStore) return;
    const id = dialogStore.id;

    setEnabledStores((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    setStoreGeofences((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    setDialogOpen(false);
    toast("Geofence removed for " + dialogStore.name);
  };

  const handleSearch = async () => {
    if (zipCode.length !== 5) return;
    setLoading(true);
    try {
      const { lat, lon } = await geocodeZipCode(zipCode);
      const results = await findNearbyStores(lat, lon, radius[0]);
      setStores(results);
      setSearched(true);
      if (results.length === 0) {
        toast.info("No grocery stores found in this area");
      }
    } catch {
      toast.error("Could not search stores. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const feetLabel = (feet: number) => {
    if (feet >= 5280) return `${(feet / 5280).toFixed(1)} mi`;
    return `${feet} ft`;
  };

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Find Stores</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Enter your zip code to find nearby grocery stores
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4 mb-4 border border-border">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter zip code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="text-base"
              inputMode="numeric"
            />
            <Button onClick={handleSearch} disabled={zipCode.length !== 5 || loading} className="shrink-0">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">Search radius</span>
              <span className="text-sm font-bold text-primary">{radius[0]} mi</span>
            </div>
            <Slider value={radius} onValueChange={setRadius} min={1} max={8} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 mi</span>
              <span>8 mi</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {searched && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              {filteredStores.length} store{filteredStores.length !== 1 ? "s" : ""} found
            </h2>
            <div className="space-y-2">
              {filteredStores.map((store, i) => {
                const isEnabled = enabledStores.has(store.id);
                const customFeet = storeGeofences.get(store.id);

                return (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={`p-4 cursor-pointer transition-all border ${
                        isEnabled ? "border-primary bg-accent" : "border-border"
                      }`}
                      onClick={() => handleStoreClick(store)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isEnabled ? "eco-gradient" : "bg-muted"
                            }`}
                          >
                            <MapPin
                              className={`w-5 h-5 ${
                                isEnabled ? "text-primary-foreground" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-card-foreground">{store.name}</p>
                            <p className="text-xs text-muted-foreground">{store.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEnabled && (
                            <Settings2 className="w-4 h-4 text-primary" />
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Navigation className="w-3 h-3" />
                            <span className="text-xs font-medium">{store.distance}</span>
                          </div>
                        </div>
                      </div>
                      {isEnabled && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-primary font-medium mt-2 pt-2 border-t border-border"
                        >
                          ✓ Geofence alert at {feetLabel(customFeet ?? DEFAULT_GEOFENCE_FEET)} — tap to adjust
                        </motion.p>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geofence Setup / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[340px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditing ? "Edit Geofence" : "Set Geofence Alert"}
            </DialogTitle>
            <DialogDescription>
              {dialogStore?.name} — choose how close you want to be before getting a reminder.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {dialogStore && (
              <GeofenceMap
                lat={dialogStore.lat}
                lon={dialogStore.lon}
                radiusFeet={dialogFeet[0]}
              />
            )}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">Alert distance</span>
              <span className="text-sm font-bold text-primary">{feetLabel(dialogFeet[0])}</span>
            </div>
            <Slider
              value={dialogFeet}
              onValueChange={setDialogFeet}
              min={25}
              max={1800}
              step={25}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>25 ft</span>
              <span>1,800 ft</span>
            </div>

            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              {dialogFeet[0] <= 100
                ? "🏪 Very close — you'll be notified right at the entrance."
                : dialogFeet[0] <= 500
                ? "🚶 Short walk — gives you time to grab bags from your car."
                : dialogFeet[0] <= 1000
                ? "🚗 Approaching — a good heads-up while you're still driving."
                : "📍 Far out — early warning so you can prepare."}
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={isEditing ? handleUpdateGeofence : handleEnableGeofence} className="w-full">
              {isEditing ? "Update Geofence" : "Enable Alert"}
            </Button>
            {isEditing && (
              <Button variant="destructive" onClick={handleDisableGeofence} className="w-full">
                Remove Geofence
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stores;
