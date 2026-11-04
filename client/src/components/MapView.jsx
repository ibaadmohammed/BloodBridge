import React, { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [17.385, 78.4867]; // Hyderabad

function donorIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function bankIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:#101E1B;border:2px solid white;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapView({ donors = [], bloodBanks = [], height = 420 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // plot donors + fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    donors.forEach((d) => {
      if (d.lat == null || d.lng == null) return;
      const color = d.status === "available" ? "#1E7F5C" : "#5C6E72";
      const marker = L.marker([d.lat, d.lng], { icon: donorIcon(color) }).addTo(map);
      marker.bindPopup(
        `<strong>${d.name}</strong><br>${d.bloodGroup} &middot; ${d.status}${
          d.distanceKm != null ? `<br>${d.distanceKm} km away` : ""
        }`
      );
      markersRef.current.push(marker);
    });

    bloodBanks.forEach((b) => {
      const marker = L.marker([b.lat, b.lng], { icon: bankIcon() }).addTo(map);
      marker.bindPopup(`<strong>${b.name}</strong><br>${b.city}<br>${b.phone}`);
      markersRef.current.push(marker);
    });

    const withCoords = donors.filter((d) => d.lat && d.lng);
    if (withCoords.length) {
      map.fitBounds(
        withCoords.map((d) => [d.lat, d.lng]),
        { maxZoom: 12, padding: [30, 30] }
      );
    }
  }, [donors, bloodBanks]);

  return <div ref={containerRef} id="map" style={{ height }} />;
}
