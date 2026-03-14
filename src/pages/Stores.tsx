import { useState } from "react";
import { MapPin, Search, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Store {
  id: string;
  name: string;
  distance: string;
  address: string;
}

const MOCK_STORES: Store[] = [
  { id: "1", name: "Whole Foods Market", distance: "0.8 mi", address: "123 Main St" },
  { id: "2", name: "Trader Joe's", distance: "1.2 mi", address: "456 Oak Ave" },
  { id: "3", name: "Kroger", distance: "2.1 mi", address: "789 Elm Blvd" },
  { id: "4", name: "Safeway", distance: "3.4 mi", address: "321 Pine Dr" },
  { id: "5", name: "ALDI", distance: "4.7 mi", address: "654 Maple Ln" },
  { id: "6", name: "Publix", distance: "5.9 mi", address: "987 Cedar Ct" },
];

const Stores = () => {
  const [zipCode, setZipCode] = useState("");
  const [radius, setRadius] = useState([5]);
  const [searched, setSearched] = useState(false);
  const [enabledStores, setEnabledStores] = useState<Set<string>>(new Set());

  const filteredStores = MOCK_STORES.filter(
    (s) => parseFloat(s.distance) <= radius[0]
  );

  const toggleStore = (id: string) => {
    setEnabledStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    if (zipCode.length === 5) setSearched(true);
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
            <Button onClick={handleSearch} disabled={zipCode.length !== 5} className="shrink-0">
              <Search className="w-4 h-4 mr-1" />
              Search
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
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              {filteredStores.length} stores found
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
