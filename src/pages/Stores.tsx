import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { geocodeZipCode, findNearbyStores, type StoreResult } from "@/lib/stores-api";
import { saveStoreData, loadStoreData } from "@/lib/store-persistence";
import { startGeofenceWatching } from "@/lib/geofence";
import { requestNotificationPermission } from "@/lib/notifications";

const Stores = () => {
  const saved = loadStoreData();
  const [zipCode, setZipCode] = useState(saved.zip);
  const [radius, setRadius] = useState([saved.radius]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreResult[]>(saved.stores);
  const [searched, setSearched] = useState(saved.stores.length > 0);
  const [enabledStores, setEnabledStores] = useState<Set<string>>(saved.enabled);

  const filteredStores = stores.filter(
    (s) => parseFloat(s.distance) <= radius[0]
  );

  // Persist whenever state changes
  useEffect(() => {
    saveStoreData(zipCode, radius[0], stores, enabledStores);
  }, [zipCode, radius, stores, enabledStores]);

  // Start geofence watching when enabled stores change
  useEffect(() => {
    const enabled = stores.filter((s) => enabledStores.has(s.id));
    if (enabled.length > 0) {
      startGeofenceWatching(enabled);
    }
  }, [enabledStores, stores]);

  const toggleStore = (id: string) => {
    setEnabledStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        requestNotificationPermission();
      }
      return next;
    });
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
              {filteredStores.map((store, i) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`p-4 cursor-pointer transition-all border ${
                      enabledStores.has(store.id)
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                    onClick={() => toggleStore(store.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            enabledStores.has(store.id) ? "eco-gradient" : "bg-muted"
                          }`}
                        >
                          <MapPin
                            className={`w-5 h-5 ${
                              enabledStores.has(store.id)
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-card-foreground">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Navigation className="w-3 h-3" />
                        <span className="text-xs font-medium">{store.distance}</span>
                      </div>
                    </div>
                    {enabledStores.has(store.id) && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-primary font-medium mt-2 pt-2 border-t border-border"
                      >
                        ✓ Geofence alert enabled — you'll be reminded when nearby
                      </motion.p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stores;
