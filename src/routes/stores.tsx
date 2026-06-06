import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, LocateFixed, MapPin, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState, K } from "@/lib/storage";
import type { HomeLocation, SavedStore } from "@/lib/types";
import { feetBetween, getCurrentPosition } from "@/lib/geo";
import { searchNearbyStores, geocodeAddress } from "@/lib/maps.functions";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "Find Stores · Bag Au Pair" },
      { name: "description", content: "Find grocery stores near home and set reminder distances." },
    ],
  }),
  component: StoresPage,
});

const FEET_PER_MILE = 5280;

function StoresPage() {
  const [home, setHome] = useLocalState<HomeLocation | null>(K.home, null);
  const [radiusFt, setRadiusFt] = useLocalState<number>(K.radiusFt, 5280); // default 1 mile
  const [stores, setStores] = useLocalState<SavedStore[]>(K.stores, []);

  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<null | "home" | "loc" | "search">(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([]);

  const radiusLabel = useMemo(() => formatFeet(radiusFt), [radiusFt]);

  async function setHomeFromAddress() {
    if (!address.trim()) return;
    setBusy("home"); setError(null);
    try {
      const r = await geocodeAddress({ data: { address } });
      setHome({ lat: r.lat, lng: r.lng, label: r.label });
      setAddress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find that address");
    } finally { setBusy(null); }
  }

  async function setHomeFromLocation() {
    setBusy("loc"); setError(null);
    try {
      const p = await getCurrentPosition();
      setHome({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        label: "Current location",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location unavailable");
    } finally { setBusy(null); }
  }

  async function searchStores() {
    if (!home) return;
    setBusy("search"); setError(null);
    try {
      const meters = radiusFt / 3.28084;
      const r = await searchNearbyStores({
        data: { lat: home.lat, lng: home.lng, radiusMeters: meters },
      });
      setResults(r.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally { setBusy(null); }
  }

  function addStore(p: { id: string; name: string; address: string; lat: number; lng: number }) {
    if (stores.find((s) => s.id === p.id)) return;
    setStores([...stores, { ...p, triggerFeet: 500 }]);
  }

  function removeStore(id: string) {
    setStores(stores.filter((s) => s.id !== id));
  }

  function updateTrigger(id: string, feet: number) {
    setStores(stores.map((s) => (s.id === id ? { ...s, triggerFeet: feet } : s)));
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Find Stores</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set home, search nearby, then tune when each store reminds you.
      </p>

      {/* Home */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Home location</h2>
          {home && (
            <span className="text-xs text-muted-foreground truncate max-w-[55%]" title={home.label}>
              {home.label}
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address or ZIP"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={setHomeFromAddress}
            disabled={busy === "home" || !address.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy === "home" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
          </button>
        </div>
        <button
          onClick={setHomeFromLocation}
          disabled={busy === "loc"}
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary disabled:opacity-50"
        >
          {busy === "loc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          Use current location
        </button>
      </section>

      {/* Search radius */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Search radius</h2>
          <span className="text-sm text-primary font-semibold">{radiusLabel}</span>
        </div>
        <input
          type="range"
          min={100}
          max={FEET_PER_MILE * 5}
          step={100}
          value={radiusFt}
          onChange={(e) => setRadiusFt(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--primary)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>100 ft</span><span>5 mi</span>
        </div>
        <button
          onClick={searchStores}
          disabled={!home || busy === "search"}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-hero px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-hero disabled:opacity-50"
        >
          {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Search nearby grocery stores
        </button>
        {!home && (
          <p className="mt-2 text-xs text-muted-foreground">Set your home location first.</p>
        )}
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Nearby
          </h2>
          <ul className="mt-2 space-y-2">
            {results.map((p) => {
              const dist = home ? feetBetween(home, p) : 0;
              const saved = stores.some((s) => s.id === p.id);
              return (
                <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
                  <div className="flex-1">
                    <div className="font-semibold leading-tight">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.address}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {dist > 0 ? `${Math.round(dist).toLocaleString()} ft from home` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => addStore(p)}
                    disabled={saved}
                    className="shrink-0 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground disabled:opacity-50"
                  >
                    {saved ? "Added" : (<><Plus className="inline h-3 w-3" /> Add</>)}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Saved stores with per-store trigger sliders */}
      {stores.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Watched stores
          </h2>
          <ul className="mt-2 space-y-3">
            {stores.map((s) => (
              <li key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.address}</div>
                  </div>
                  <button
                    onClick={() => removeStore(s.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Remind me within</span>
                  <span className="font-semibold text-primary">{formatFeet(s.triggerFeet)}</span>
                </div>
                <input
                  type="range" min={0} max={5000} step={50}
                  value={s.triggerFeet}
                  onChange={(e) => updateTrigger(s.id, Number(e.target.value))}
                  className="mt-1 w-full accent-[var(--primary)]"
                />
                <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>0 ft</span><span>5000 ft</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

function formatFeet(ft: number): string {
  if (ft >= FEET_PER_MILE) return `${(ft / FEET_PER_MILE).toFixed(ft % FEET_PER_MILE === 0 ? 0 : 1)} mi`;
  return `${ft.toLocaleString()} ft`;
}
