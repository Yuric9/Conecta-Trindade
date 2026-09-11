'use client';

import { useEffect, useRef } from 'react';
import { TRINDADE_CENTER } from '@/lib/geo';
import type { Chamado } from '@/lib/types';

interface AdminMapProps {
  chamados: Chamado[];
  onSelect?: (chamado: Chamado) => void;
}

export default function AdminMap({ chamados, onSelect }: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    (async () => {
      const L = (await import('leaflet')).default;

      if (destroyed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [TRINDADE_CENTER.lat, TRINDADE_CENTER.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const colors: Record<string, string> = {
        ABERTO: '#f59e0b',
        TRIADO: '#a855f7',
        EM_ANDAMENTO: '#3b82f6',
        RESOLVIDO: '#16a34a',
        REJEITADO: '#ef4444',
        AVALIADO: '#14b8a6',
      };

      chamados.forEach((c) => {
        const color = colors[c.status] || '#6b7280';
        const icon = L.divIcon({
          className: 'admin-marker',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <strong>${c.protocolo}</strong><br/>
            <span style="font-size: 12px;">${c.categoria}</span><br/>
            <span style="font-size: 11px; color: #666;">${c.descricao.substring(0, 80)}...</span>
          </div>
        `);

        if (onSelect) {
          marker.on('click', () => onSelect(c));
        }

        markersRef.current.push(marker);
      });
    })();
  }, [chamados, onSelect]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg overflow-hidden"
    />
  );
}
