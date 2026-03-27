import { useState } from "react";
import { Briefcase, Navigation, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import GeofenceMap from "@/components/GeofenceMap";
import { motion } from "framer-motion";
import { saveWorkLocation, loadWorkLocation, clearWorkLocation, type WorkLocation } from "@/lib/work-location";
import { reverseGeocode } from "@/lib/home-location";
import { toast } from "sonner";

interface Props {
  delay?: number;
}

const WorkLocationCard = ({ delay = 0.14 }: Props) => {
  const [work, setWork] = useState<WorkLocation | null>(loadWorkLocation);
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
        const loc: WorkLocation = { lat: latitude, lon: longitude, label };
        saveWorkLocation(loc);
        setWork(loc);
        setLoading(false);
        toast.success("Work location saved!");
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
      const loc: WorkLocation = { lat: parseFloat(lat), lon: parseFloat(lon), label };
      saveWorkLocation(loc);
      setWork(loc);
      setShowManual(false);
      setManualAddress("");
      toast.success("Work location saved!");
    } catch {
      toast.error("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const handleClear = () => {
    clearWorkLocation();
    setWork(null);
    toast("Work location removed");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-4 border border-border">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-card-foreground">Work Location</p>
              <p className="text-xs text-muted-foreground">
                {work ? "Reminds you to open the app when leaving" : "Set so leaving-work reminder works"}
              </p>
            </div>
          </div>
        </div>

        {work ? (
          <div className="mt-2 pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="w-3.5 h-3.5 text-secondary-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">{work.label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Leaving geofence radius:</span>
                <span className="text-xs font-semibold text-foreground">{work.radiusFeet || 500} ft</span>
              </div>
              <Slider
                value={[work.radiusFeet || 500]}
                onValueChange={([v]) => {
                  const updated = { ...work, radiusFeet: v };
                  setWork(updated);
                  saveWorkLocation(updated);
                }}
                min={25} max={1800} step={25}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>25 ft</span>
                <span>1,800 ft</span>
              </div>
            </div>
            <GeofenceMap lat={work.lat} lon={work.lon} radiusFeet={work.radiusFeet || 500} />
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
                  placeholder="Enter your work address"
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

export default WorkLocationCard;
