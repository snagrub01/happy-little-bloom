import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GeofenceMapProps {
  lat: number;
  lon: number;
  radiusFeet: number;
}

const GeofenceMap = ({ lat, lon, radiusFeet }: GeofenceMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  const radiusMeters = radiusFeet * 0.3048;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([lat, lon], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    markerRef.current = L.circleMarker([lat, lon], {
      radius: 6,
      fillColor: "hsl(142, 71%, 45%)",
      fillOpacity: 1,
      color: "#fff",
      weight: 2,
    }).addTo(map);

    circleRef.current = L.circle([lat, lon], {
      radius: radiusMeters,
      color: "hsl(142, 71%, 45%)",
      fillColor: "hsl(142, 71%, 45%)",
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    map.fitBounds(circleRef.current.getBounds().pad(0.3));
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [lat, lon]);

  useEffect(() => {
    if (!circleRef.current || !mapInstance.current) return;
    circleRef.current.setRadius(radiusMeters);
    mapInstance.current.fitBounds(circleRef.current.getBounds().pad(0.3));
  }, [radiusMeters]);

  return (
    <div
      ref={mapRef}
      className="w-full h-40 rounded-lg overflow-hidden border border-border"
    />
  );
};

export default GeofenceMap;
