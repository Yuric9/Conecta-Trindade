'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TRINDADE_CENTER,
  TRINDADE_LEAFLET_BOUNDS,
  TRINDADE_MAP_ZOOM,
  isWithinTrindade,
  clampToTrindade,
} from '@/lib/geo';
import { TRINDADE_GEOJSON } from '@/lib/trindade-geojson';
import { ORGAOS_PUBLICOS_TRINDADE, OrgaoPublico } from '@/lib/public-places';
import { Building2, MapPin, Navigation } from 'lucide-react';

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

export default function MapPicker({
  latitude,
  longitude,
  onChange,
  height = '420px',
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const orgaosLayerRef = useRef<any>(null);

  const [showOrgaos, setShowOrgaos] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    loadLeafletCss();

    (async () => {
      const L = (await import('leaflet')).default;
      if (destroyed || !containerRef.current) return;

      const safeCoords =
        latitude && longitude && isWithinTrindade(latitude, longitude)
          ? { lat: latitude, lng: longitude }
          : TRINDADE_CENTER;

      const trindadeBounds = L.latLngBounds(TRINDADE_LEAFLET_BOUNDS);

      const map = L.map(containerRef.current, {
        center: [safeCoords.lat, safeCoords.lng],
        zoom: 15,
        minZoom: TRINDADE_MAP_ZOOM.min,
        maxZoom: TRINDADE_MAP_ZOOM.max,
        maxBounds: trindadeBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | Conecta Trindade',
        bounds: trindadeBounds,
        minZoom: TRINDADE_MAP_ZOOM.min,
        maxZoom: TRINDADE_MAP_ZOOM.max,
      }).addTo(map);

      // 1. Preenchimento sutil do território (100% não-interativo para não capturar mouse nem exibir tooltip)
      L.geoJSON(TRINDADE_GEOJSON as any, {
        style: {
          color: 'transparent',
          weight: 0,
          fillColor: '#006653',
          fillOpacity: 0.03,
        },
        interactive: false,
      }).addTo(map);

      // Coordenadas da linha perimetral da divisa de Trindade [lat, lng]
      const borderCoords = (TRINDADE_GEOJSON.coordinates[0] as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );

      // 2. Linha branca de contraste para o limite municipal (não-interativa)
      L.polyline(borderCoords, {
        color: '#ffffff',
        weight: 7,
        opacity: 0.95,
        interactive: false,
      }).addTo(map);

      // 3. Linha perimetral oficial (interativa SOMENTE ao passar o mouse diretamente sobre a linha da divisa)
      const borderLine = L.polyline(borderCoords, {
        color: '#006653',
        weight: 3.5,
        opacity: 1,
        dashArray: '9, 6',
        interactive: true,
      }).addTo(map);

      borderLine.bindTooltip('🏛️ Limite Oficial do Município de Trindade - GO', {
        sticky: false,
        direction: 'top',
        className: 'trindade-boundary-tooltip',
      });

      // Marcador selecionável do chamado
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pulse" style="width:36px;height:36px;border-radius:50%;background:#006653;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const marker = L.marker([safeCoords.lat, safeCoords.lng], {
        draggable: true,
        icon,
      }).addTo(map);

      markerRef.current = marker;

      // Eventos de arrastar e clicar para selecionar local
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const clamped = clampToTrindade(pos.lat, pos.lng);
        marker.setLatLng([clamped.lat, clamped.lng]);
        onChange(clamped.lat, clamped.lng);
      });

      map.on('click', (e: any) => {
        const clamped = clampToTrindade(e.latlng.lat, e.latlng.lng);
        marker.setLatLng([clamped.lat, clamped.lng]);
        onChange(clamped.lat, clamped.lng);
      });

      // Camada para os prédios públicos de referência
      const orgaosLayer = L.layerGroup().addTo(map);
      orgaosLayerRef.current = orgaosLayer;

      // Adicionar prédios públicos como referência visual
      ORGAOS_PUBLICOS_TRINDADE.forEach((orgao: OrgaoPublico) => {
        const orgaoIcon = L.divIcon({
          className: 'orgao-marker-pin',
          html: `
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 8px;
              background: ${orgao.cor};
              border: 2px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            ">
              ${orgao.emoji}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const oMarker = L.marker([orgao.latitude, orgao.longitude], {
          icon: orgaoIcon,
        });

        oMarker.bindTooltip(
          `<strong>${orgao.emoji} ${orgao.nome}</strong><br/><span style="font-size:10px;opacity:0.9;">Ponto de Referência (${orgao.tipoLabel})</span>`,
          { className: 'orgao-tooltip', direction: 'top', offset: [0, -16] }
        );

        // Ao clicar no prédio público, oferece selecionar o local como ponto da solicitação
        const popupContent = `
          <div style="font-family: sans-serif; padding: 10px; width: 230px;">
            <div style="font-size: 18px; margin-bottom: 4px;">${orgao.emoji}</div>
            <strong style="font-size: 13px; color: #173b32; display: block; line-height: 1.2;">${orgao.nome}</strong>
            <span style="font-size: 10.5px; color: #64748b; display: block; margin: 3px 0 6px;">${orgao.tipoLabel} - ${orgao.bairro}</span>
            <p style="font-size: 11px; color: #475569; margin: 0 0 8px;">${orgao.endereco}</p>
            <button
              id="btn-pick-${orgao.id}"
              style="
                width: 100%;
                background: #006653;
                color: white;
                border: none;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
              "
            >
              Marcar problema neste local
            </button>
          </div>
        `;

        oMarker.bindPopup(popupContent);
        oMarker.on('popupopen', () => {
          const btn = document.getElementById(`btn-pick-${orgao.id}`);
          if (btn) {
            btn.onclick = () => {
              marker.setLatLng([orgao.latitude, orgao.longitude]);
              onChange(orgao.latitude, orgao.longitude);
              map.closePopup();
            };
          }
        });

        orgaosLayer.addLayer(oMarker);
      });

      // Tenta geolocalização se não houver coordenadas definidas
      if (!latitude) {
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (isWithinTrindade(lat, lng)) {
              map.setView([lat, lng], 17);
              marker.setLatLng([lat, lng]);
              onChange(lat, lng);
            } else {
              map.setView([TRINDADE_CENTER.lat, TRINDADE_CENTER.lng], 15);
              marker.setLatLng([TRINDADE_CENTER.lat, TRINDADE_CENTER.lng]);
              onChange(TRINDADE_CENTER.lat, TRINDADE_CENTER.lng);
            }
          },
          () => {
            map.setView([TRINDADE_CENTER.lat, TRINDADE_CENTER.lng], 15);
            marker.setLatLng([TRINDADE_CENTER.lat, TRINDADE_CENTER.lng]);
            onChange(TRINDADE_CENTER.lat, TRINDADE_CENTER.lng);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

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

  // Ligar/Desligar camada de órgãos públicos
  useEffect(() => {
    if (!orgaosLayerRef.current || !mapRef.current) return;
    if (showOrgaos) {
      mapRef.current.addLayer(orgaosLayerRef.current);
    } else {
      mapRef.current.removeLayer(orgaosLayerRef.current);
    }
  }, [showOrgaos]);

  // Atualizar posição do marcador caso mude via props
  useEffect(() => {
    if (markerRef.current && latitude && longitude && isWithinTrindade(latitude, longitude)) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border-2 border-emerald-100 shadow-sm">
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* Botões superiores: Referências e Localização Atual */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowOrgaos(!showOrgaos)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md backdrop-blur-md transition-all ${
            showOrgaos
              ? 'bg-[#006653] text-white'
              : 'bg-white/95 text-gray-700 hover:bg-white'
          }`}
          title="Exibir ou ocultar órgãos públicos como pontos de referência"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Prédios Públicos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation && mapRef.current && markerRef.current) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude: lat, longitude: lng } = pos.coords;
                  if (isWithinTrindade(lat, lng)) {
                    mapRef.current.setView([lat, lng], 17);
                    markerRef.current.setLatLng([lat, lng]);
                    onChange(lat, lng);
                  }
                },
                () => {},
                { enableHighAccuracy: true }
              );
            }
          }}
          className="bg-white/95 hover:bg-white text-[#173b32] p-2 rounded-lg text-xs font-semibold shadow-md backdrop-blur-md border border-gray-200 transition-colors"
          title="Usar minha localização GPS"
        >
          <Navigation className="w-4 h-4 text-[#006653]" />
        </button>
      </div>

      {/* Legenda dos limites municipais */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-emerald-200 text-[11px] text-gray-700 flex items-center gap-2 pointer-events-none">
        <span className="inline-block w-6 h-0 border-t-2 border-dashed border-[#006653]" />
        <span className="font-semibold text-[#173b32]">
          Área do Município de Trindade - GO
        </span>
      </div>
    </div>
  );
}
