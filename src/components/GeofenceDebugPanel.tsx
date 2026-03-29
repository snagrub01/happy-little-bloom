import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, MapPin, Home, Briefcase, Navigation } from "lucide-react";
import { loadHomeLocation } from "@/lib/home-location";
import { loadWorkLocation } from "@/lib/work-location";
import { loadReminderSettings } from "@/lib/reminder-persistence";

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function feetFromMiles(miles: number): number {
  return Math.round(miles * 5280);
}

interface GeoLog {
  time: string;
  message: string;
}

const GeofenceDebugPanel = () => {
  const [open, setOpen] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [logs, setLogs] = useState<GeoLog[]>([]);
  const [watchActive, setWatchActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), message: msg }, ...prev].slice(0, 20));
  };

  const startWatch = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not available");
      return;
    }
    addLog("Starting GPS watch...");
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoError(null);
        setWatchActive(true);
        addLog(`GPS update: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setGeoError(err.message);
        addLog(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setWatchId(id);
  };

  const stopWatch = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setWatchActive(false);
      addLog("GPS watch stopped");
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Bug className="w-3 h-3 mr-1" /> Show Geofence Debug
      </Button>
    );
  }

  const home = loadHomeLocation();
  const work = loadWorkLocation();
  const settings = loadReminderSettings();

  const homeDistFeet = currentPos && home ? feetFromMiles(distanceMiles(currentPos.lat, currentPos.lon, home.lat, home.lon)) : null;
  const workDistFeet = currentPos && work ? feetFromMiles(distanceMiles(currentPos.lat, currentPos.lon, work.lat, work.lon)) : null;
  const homeRadius = home?.radiusFeet || 500;
  const workRadius = work?.radiusFeet || 500;
  const homeExitThreshold = homeRadius * 3;
  const workExitThreshold = workRadius * 3;

  return (
    <Card className="p-4 border border-border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-card-foreground">Geofence Debug</span>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { stopWatch(); setOpen(false); }}>
          Close
        </Button>
      </div>

      {/* GPS Controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={startWatch} disabled={watchActive}>
          <Navigation className="w-3 h-3 mr-1" /> Start GPS
        </Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={stopWatch} disabled={!watchActive}>
          Stop GPS
        </Button>
      </div>

      {geoError && <p className="text-xs text-destructive">⚠️ {geoError}</p>}

      {/* Current Position */}
      {currentPos && (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Current:</span>
            <span className="font-mono text-foreground">{currentPos.lat.toFixed(5)}, {currentPos.lon.toFixed(5)}</span>
          </div>
        </div>
      )}

      {/* Home Status */}
      <div className="text-xs space-y-1 border-t border-border pt-2">
        <div className="flex items-center gap-2">
          <Home className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-card-foreground">Home</span>
          {home ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Set</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Not set</Badge>
          )}
          {settings.leavingHome.enabled ? (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">Armed</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Off</Badge>
          )}
        </div>
        {home && (
          <div className="pl-5 space-y-0.5 text-muted-foreground">
            <p>📍 {home.lat.toFixed(5)}, {home.lon.toFixed(5)}</p>
            <p>🔵 Geofence radius: {homeRadius} ft</p>
            <p>🚪 Exit trigger: {homeExitThreshold} ft (3× radius)</p>
            {homeDistFeet !== null && (
              <p className={homeDistFeet > homeExitThreshold ? "text-destructive font-medium" : "text-foreground"}>
                📏 Current distance: {homeDistFeet.toLocaleString()} ft
                {homeDistFeet <= homeRadius && " — 🏠 Inside home zone"}
                {homeDistFeet > homeRadius && homeDistFeet <= homeExitThreshold && " — ⚡ Between zones"}
                {homeDistFeet > homeExitThreshold && " — 🚗 OUTSIDE (should trigger!)"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Work Status */}
      <div className="text-xs space-y-1 border-t border-border pt-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-card-foreground">Work</span>
          {work ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Set</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Not set</Badge>
          )}
          {settings.leavingWork.enabled ? (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">Armed</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Off</Badge>
          )}
        </div>
        {work && (
          <div className="pl-5 space-y-0.5 text-muted-foreground">
            <p>📍 {work.lat.toFixed(5)}, {work.lon.toFixed(5)}</p>
            <p>🔵 Geofence radius: {workRadius} ft</p>
            <p>🚪 Exit trigger: {workExitThreshold} ft (3× radius)</p>
            {workDistFeet !== null && (
              <p className={workDistFeet > workExitThreshold ? "text-destructive font-medium" : "text-foreground"}>
                📏 Current distance: {workDistFeet.toLocaleString()} ft
                {workDistFeet <= workRadius && " — 🏢 Inside work zone"}
                {workDistFeet > workRadius && workDistFeet <= workExitThreshold && " — ⚡ Between zones"}
                {workDistFeet > workExitThreshold && " — 🚗 OUTSIDE (should trigger!)"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Event Log */}
      <div className="border-t border-border pt-2">
        <p className="text-xs font-medium text-card-foreground mb-1">📋 GPS Event Log</p>
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {logs.length === 0 && <p className="text-xs text-muted-foreground italic">No events yet. Tap "Start GPS" above.</p>}
          {logs.map((log, i) => (
            <p key={i} className="text-[10px] text-muted-foreground font-mono">
              <span className="text-foreground/50">{log.time}</span> {log.message}
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default GeofenceDebugPanel;
