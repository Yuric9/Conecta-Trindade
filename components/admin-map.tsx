'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  TRINDADE_CENTER,
  TRINDADE_LEAFLET_BOUNDS,
  TRINDADE_MAP_ZOOM,
} from '@/lib/geo';
import { TRINDADE_GEOJSON } from '@/lib/trindade-geojson';
import { getCategoriaInfo } from '@/lib/types';
import {
  iconeCategoria,
  corDoStatus,
  LEGENDA_STATUS,
  pinoHtml,
  iconeInlineHtml,
  TAMANHO_PINO,
  ANCORA_PINO,
} from '@/lib/map-icons';
import { escapeHtml as esc } from '@/lib/utils';
import type { Chamado } from '@/lib/types';
import { Search, AlertCircle, MapPin, X } from 'lucide-react';

// Mapa do painel: só os chamados. Os prédios públicos ficam fora para não
// disputar espaço com os pinos (eles seguem na aba "Prédios públicos").
interface AdminMapProps {
  chamados: Chamado[];
  onSelect?: (chamado: Chamado) => void;
}

export default function AdminMap({ chamados, onSelect }: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const chamadosLayerRef = useRef<any>(null);
  const markerLookupRef = useRef<Map<string, any>>(new Map());

  const [searchQuery, setSearchQuery] = useState('');
  // O Leaflet carrega de forma assíncrona: só desenhamos os marcadores
  // depois que o mapa e as camadas existem.
  const [mapaPronto, setMapaPronto] = useState(false);

  // Só chamados com localização salva aparecem no mapa.
  const chamadosNoMapa = useMemo(
    () => chamados.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)),
    [chamados]
  );

  // Inicialização do mapa do Leaflet
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    (async () => {
      const L = (await import('leaflet')).default;

      if (destroyed || !containerRef.current) return;

      const trindadeBounds = L.latLngBounds(TRINDADE_LEAFLET_BOUNDS);

      // Instância do mapa com restrições rígidas para Trindade - GO
      const map = L.map(containerRef.current, {
        center: [TRINDADE_CENTER.lat, TRINDADE_CENTER.lng],
        zoom: TRINDADE_MAP_ZOOM.default,
        minZoom: TRINDADE_MAP_ZOOM.min,
        maxZoom: TRINDADE_MAP_ZOOM.max,
        maxBounds: trindadeBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: false, // Controle de zoom customizado ou posicionado
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Camada base OSM
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | Município de Trindade',
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

      chamadosLayerRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      setMapaPronto(true);
    })();

    return () => {
      destroyed = true;
      setMapaPronto(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Atualização dos marcadores dos chamados
  useEffect(() => {
    if (!mapRef.current || !chamadosLayerRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      const chamadosLayer = chamadosLayerRef.current;

      chamadosLayer.clearLayers();
      markerLookupRef.current.clear();

      chamadosNoMapa.forEach((c) => {
        const catInfo = getCategoriaInfo(c.categoria);
        const isAtrasado =
          c.sla_limite &&
          new Date(c.sla_limite) < new Date() &&
          c.status !== 'RESOLVIDO' &&
          c.status !== 'REJEITADO';

        const IconeCategoria = iconeCategoria(catInfo?.id || 'OUTROS');
        const status = corDoStatus(c.status);
        const corPino = isAtrasado ? '#b91c1c' : status.cor;

        const icon = L.divIcon({
          className: 'ct-marcador',
          html: pinoHtml(IconeCategoria, corPino),
          iconSize: TAMANHO_PINO,
          iconAnchor: ANCORA_PINO,
          popupAnchor: [0, -40],
        });

        const marker = L.marker([c.latitude, c.longitude], { icon });

        marker.bindTooltip(
          `<strong>${esc(c.protocolo)}</strong> · ${esc(catInfo?.label || c.categoria)}`,
          { direction: 'top', offset: [0, -42] }
        );

        const popupHtml = `
          <div style="width: 260px; font-family: inherit; padding: 12px; color: #1f2937;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${iconeInlineHtml(IconeCategoria, corPino, 16)}
                <span style="font-weight: 600; font-size: 13px;">${esc(c.protocolo)}</span>
              </div>
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: ${status.cor};">
                <span style="width: 8px; height: 8px; border-radius: 9999px; background: ${status.cor};"></span>
                ${status.label}
              </span>
            </div>
            ${
              c.fotos && c.fotos.length > 0 && /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(c.fotos[0])
                ? `<div style="width: 100%; height: 100px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f3f4f6;">
                    <img src="${esc(c.fotos[0])}" alt="Foto do chamado" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>`
                : ''
            }
            <p style="margin: 0 0 2px; font-size: 12px; font-weight: 600; color: #374151;">${esc(catInfo?.label || c.categoria)}</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${esc(c.descricao)}</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #4b5563;">${esc(c.endereco_texto || 'Sem endereço detalhado')}</p>
            ${isAtrasado ? `<p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #b91c1c;">Prazo vencido</p>` : ''}
            <button id="btn-chamado-${c.id}" style="width: 100%; background: #006653; color: #fff; border: none; padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
              Abrir chamado
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 300 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-chamado-${c.id}`);
          if (btn && onSelect) {
            btn.onclick = () => onSelect(c);
          }
        });

        if (onSelect) {
          marker.on('click', () => {
            // Permite abrir os detalhes também pelo clique direto caso desejado
          });
        }

        chamadosLayer.addLayer(marker);
        markerLookupRef.current.set(`chamado-${c.id}`, marker);
      });
    })();
  }, [mapaPronto, chamadosNoMapa, onSelect]);

  // Função para voar até um local pesquisado
  const handleSelectSearchResult = (lat: number, lng: number, key?: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    setSearchQuery('');

    if (key && markerLookupRef.current.has(key)) {
      setTimeout(() => {
        markerLookupRef.current.get(key)?.openPopup();
      }, 1300);
    }
  };

  // Resultados da busca rápida no mapa
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();

    const chamadosMatches = chamadosNoMapa
      .filter(
        (c) =>
          c.protocolo.toLowerCase().includes(q) ||
          c.descricao.toLowerCase().includes(q) ||
          (c.endereco_texto && c.endereco_texto.toLowerCase().includes(q))
      )
      .slice(0, 6)
      .map((c) => ({
        tipo: 'chamado' as const,
        id: c.id,
        titulo: `O.S. ${c.protocolo}`,
        subtitulo: `${c.categoria} - ${c.endereco_texto || 'Sem endereço'}`,
        Icone: iconeCategoria(getCategoriaInfo(c.categoria).id),
        cor: corDoStatus(c.status).cor,
        lat: c.latitude,
        lng: c.longitude,
        key: `chamado-${c.id}`,
      }));

    return chamadosMatches;
  }, [searchQuery, chamadosNoMapa]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200">
      {/* Contêiner principal do Leaflet */}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* BARRA SUPERIOR DE FILTROS E CAMADAS (Floating Overlay) */}
      <div className="absolute top-3 left-3 right-14 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Busca rápida de chamados */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar O.S., endereço, descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs bg-white/95 backdrop-blur-md rounded-lg border border-gray-200 shadow-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006653] focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Menu de sugestões da busca */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-10 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-50 divide-y divide-gray-100">
              {searchResults.map((item) => (
                <button
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => handleSelectSearchResult(item.lat, item.lng, item.key)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/80 transition-colors flex items-center gap-2.5"
                >
                  <item.Icone className="w-4 h-4 flex-shrink-0" style={{ color: item.cor }} />
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 truncate">{item.titulo}</p>
                    <p className="text-[10.5px] text-gray-500 truncate">{item.subtitulo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantidade de chamados no mapa */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-2 rounded-lg border border-gray-200 shadow-md text-xs font-medium text-gray-700">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Chamados no mapa ({chamadosNoMapa.length})</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 left-3 z-[400] bg-white/95 px-3 py-2.5 rounded-lg shadow-md border border-gray-200 text-xs text-gray-700 max-w-xs">
        <p className="font-semibold text-gray-900 mb-1.5">Chamados por status</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
          {LEGENDA_STATUS.map((st) => (
            <div key={st.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.cor }} />
              <span>{st.label}</span>
            </div>
          ))}
        </div>
        <div className="pt-1.5 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-[#006653]" />
            <span>Limite do município</span>
          </div>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE DE RESET/CENTRALIZAR EM TRINDADE */}
      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.setView([TRINDADE_CENTER.lat, TRINDADE_CENTER.lng], TRINDADE_MAP_ZOOM.default);
          }
        }}
        className="absolute bottom-4 right-3 z-[400] bg-white/95 backdrop-blur-sm hover:bg-white text-[#173b32] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-1.5 transition-colors"
        title="Centralizar mapa em Trindade"
      >
        <MapPin className="w-3.5 h-3.5 text-[#006653]" />
        <span>Centro de Trindade</span>
      </button>
    </div>
  );
}
