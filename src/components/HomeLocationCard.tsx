import { useState } from "react";
import { MapPin, Navigation, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { saveHomeLocation, loadHomeLocation, clearHomeLocation, reverseGeocode, type HomeLocation } from "@/lib/home-location";
import { toast } from "sonner";

interface Props {
  delay?: number;
}

const HomeLocationCard = ({ delay = 0.13 }: Props) => {
  const [home, setHome] = useState<HomeLocation | null>(loadHomeLocation);
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleUseCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        const loc: HomeLocation = { lat: latitude, lon: longitude, label };
        saveHomeLocation(loc);
        setHome(loc);
        setLoading(false);
        toast.success("Home location saved!");
      },
      () => {
        setLoading(false);
        toast.error("Could not get your location. Please check permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualAddress)}&format=json&limit=1`,
        { headers: { "User-Agent": "BagAuPair/1.0" } }
      );
      const results = await res.json();
      if (results.length === 0) {
        toast.error("Address not found. Try a different search.");
        setLoading(false);
        return;
      }
      const { lat, lon, display_name } = results[0];
      const label = display_name.split(",").slice(0, 3).join(",").trim();
      const loc: HomeLocation = { lat: parseFloat(lat), lon: parseFloat(lon), label };
      saveHomeLocation(loc);
      setHome(loc);
      setShowManual(false);
      setManualAddress("");
      toast.success("Home location saved!");
    } catch {
      toast.error("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const handleClear = () => {
    clearHomeLocation();
    setHome(null);
    toast("Home location removed");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-4 border border-border">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-card-foreground">Home Location</p>
              <p className="text-xs text-muted-foreground">
                {home ? "Used for bag-return reminders" : "Set so bag-return works correctly"}
              </p>
            </div>
          </div>
        </div>

        {home ? (
          <div className="mt-2 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground truncate">{home.label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 pt-3 border-t border-border space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
              onClick={handleUseCurrentLocation}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Use my current location
            </Button>

            {!showManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
              >
                Or enter address manually
              </button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Enter your home address"
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                />
                <Button size="sm" className="h-8" onClick={handleManualSearch} disabled={loading}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default HomeLocationCard;
