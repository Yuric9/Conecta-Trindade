'use client';

import { useEffect, useRef } from 'react';
import { TRINDADE_CENTER, isWithinTrindade } from '@/lib/geo';

let leafletCssLoaded = false;
function loadLeafletCss() {
  if (leafletCssLoaded || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  leafletCssLoaded = true;
}

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

export default function MapPicker({ latitude, longitude, onChange, height = '400px' }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: any;
    let marker: any;

    loadLeafletCss();

    (async () => {
      const L = (await import('leaflet')).default;

      map = L.map(containerRef.current!, {
        center: [latitude || TRINDADE_CENTER.lat, longitude || TRINDADE_CENTER.lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pulse" style="width:32px;height:32px;border-radius:50%;background:#1E5BC6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      marker = L.marker(
        [latitude || TRINDADE_CENTER.lat, longitude || TRINDADE_CENTER.lng],
        { draggable: true, icon }
      ).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      if (!latitude) {
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (isWithinTrindade(lat, lng)) {
              map.setView([lat, lng], 17);
              marker.setLatLng([lat, lng]);
              onChange(lat, lng);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    })();

    return () => {
      if (map) map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden border-2 border-gray-200"
    />
  );
}
