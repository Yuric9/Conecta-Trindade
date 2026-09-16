'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  TRINDADE_CENTER,
  TRINDADE_LEAFLET_BOUNDS,
  TRINDADE_MAP_ZOOM,
  distanceMeters,
} from '@/lib/geo';
import { TRINDADE_GEOJSON } from '@/lib/trindade-geojson';
import {
  ORGAOS_PUBLICOS_TRINDADE,
  CATEGORIAS_ORGAOS,
  OrgaoPublico,
} from '@/lib/public-places';
import { getCategoriaInfo, getStatusInfo, formatData } from '@/lib/types';
import type { Chamado } from '@/lib/types';
import {
  Search,
  Building2,
  AlertCircle,
  Eye,
  Filter,
  Check,
  ChevronDown,
  Layers,
  MapPin,
  X,
  Phone,
  Clock,
} from 'lucide-react';

interface AdminMapProps {
  chamados: Chamado[];
  orgaos?: OrgaoPublico[];
  onSelect?: (chamado: Chamado) => void;
  onEditOrgao?: (orgao: OrgaoPublico) => void;
  onDeleteOrgao?: (orgaoId: string) => void;
  onNewOrgaoAtCoord?: (lat: number, lng: number) => void;
}

export default function AdminMap({
  chamados,
  orgaos,
  onSelect,
  onEditOrgao,
  onDeleteOrgao,
  onNewOrgaoAtCoord,
}: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const chamadosLayerRef = useRef<any>(null);
  const orgaosLayerRef = useRef<any>(null);
  const markerLookupRef = useRef<Map<string, any>>(new Map());

  // Controles de visualização de camadas
  const [showChamados, setShowChamados] = useState(true);
  const [showOrgaos, setShowOrgaos] = useState(true);
  const [selectedTipoOrgao, setSelectedTipoOrgao] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterPopover, setActiveFilterPopover] = useState(false);
  const [selectedOrgaoInfo, setSelectedOrgaoInfo] = useState<OrgaoPublico | null>(null);

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

      // Grupos de camadas para facilitar ligar/desligar
      chamadosLayerRef.current = L.layerGroup().addTo(map);
      orgaosLayerRef.current = L.layerGroup().addTo(map);

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

  // Lista dinâmica ou padrão de órgãos públicos
  const allOrgaos = useMemo(() => orgaos || ORGAOS_PUBLICOS_TRINDADE, [orgaos]);

  // Filtro de órgãos públicos conforme seleção
  const orgaosFiltrados = useMemo(() => {
    return allOrgaos.filter((o) => {
      if (selectedTipoOrgao === 'TODOS') return true;
      if (selectedTipoOrgao === 'PREFEITURA_SEC') {
        return o.tipo === 'PREFEITURA' || o.tipo === 'SECRETARIA' || o.tipo === 'SERVICO';
      }
      if (selectedTipoOrgao === 'SAUDE') {
        return o.tipo === 'UBS' || o.tipo === 'HOSPITAL_UPA';
      }
      if (selectedTipoOrgao === 'EDUCACAO') {
        return o.tipo === 'ESCOLA' || o.tipo === 'CMEI';
      }
      if (selectedTipoOrgao === 'PARQUES') {
        return o.tipo === 'PARQUE';
      }
      if (selectedTipoOrgao === 'ECOPONTO') {
        return o.tipo === 'ECOPONTO';
      }
      if (selectedTipoOrgao === 'SERVICO') {
        return o.tipo === 'SERVICO';
      }
      return true;
    });
  }, [allOrgaos, selectedTipoOrgao]);

  // Atualização dos marcadores de Chamados e Prédios Públicos
  useEffect(() => {
    if (!mapRef.current || !chamadosLayerRef.current || !orgaosLayerRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      const chamadosLayer = chamadosLayerRef.current;
      const orgaosLayer = orgaosLayerRef.current;

      chamadosLayer.clearLayers();
      orgaosLayer.clearLayers();
      markerLookupRef.current.clear();

      // ==========================================
      // 1. ADICIONAR MARCADORES DE ÓRGÃOS PÚBLICOS
      // ==========================================
      if (showOrgaos) {
        orgaosFiltrados.forEach((orgao) => {
          // Identificar quantos chamados existem nas proximidades deste prédio público (600m)
          const chamadosEntorno = chamados.filter(
            (c) => distanceMeters(c.latitude, c.longitude, orgao.latitude, orgao.longitude) <= 600
          );

          // Ícone estilizado do prédio público
          const icon = L.divIcon({
            className: 'orgao-marker-pin',
            html: `
              <div style="
                width: 34px;
                height: 34px;
                border-radius: 10px;
                background: ${orgao.cor};
                border: 2.5px solid #ffffff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 17px;
                position: relative;
              ">
                ${orgao.emoji}
                ${
                  chamadosEntorno.length > 0
                    ? `<span style="
                        position: absolute;
                        top: -6px;
                        right: -6px;
                        background: #dc2626;
                        color: #ffffff;
                        font-size: 10px;
                        font-weight: 800;
                        border-radius: 9999px;
                        padding: 1px 5px;
                        border: 1.5px solid #ffffff;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      ">${chamadosEntorno.length}</span>`
                    : ''
                }
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });

          const marker = L.marker([orgao.latitude, orgao.longitude], { icon });

          // Tooltip ao passar o mouse
          marker.bindTooltip(`<strong>${orgao.emoji} ${orgao.nome}</strong>`, {
            className: 'orgao-tooltip',
            direction: 'top',
            offset: [0, -18],
          });

          // Popup detalhado com dados oficiais do prédio público
          const popupContent = `
            <div style="width: 270px; font-family: sans-serif; padding: 12px; color: #1e293b;">
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 24px; line-height: 1;">${orgao.emoji}</span>
                <div>
                  <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #173b32; line-height: 1.2;">
                    ${orgao.nome}
                  </h3>
                  <span style="
                    display: inline-block;
                    margin-top: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: ${orgao.cor}15;
                    color: ${orgao.cor};
                    border: 1px solid ${orgao.cor}40;
                  ">
                    ${orgao.tipoLabel}
                  </span>
                </div>
              </div>

              <div style="font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
                <p style="margin: 3px 0;"><strong>📍 Endereço:</strong> ${orgao.endereco} - ${orgao.bairro}</p>
                ${orgao.horario ? `<p style="margin: 3px 0;"><strong>🕒 Horário:</strong> ${orgao.horario}</p>` : ''}
                ${orgao.telefone ? `<p style="margin: 3px 0;"><strong>📞 Contato:</strong> ${orgao.telefone}</p>` : ''}
              </div>

              ${
                orgao.descricao
                  ? `<p style="margin: 6px 0; font-size: 11px; color: #64748b; font-style: italic; background: #f8fafc; padding: 6px; border-radius: 6px;">
                      ${orgao.descricao}
                    </p>`
                  : ''
              }

              <div style="
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11px;
              ">
                <span style="color: ${chamadosEntorno.length > 0 ? '#dc2626' : '#16a34a'}; font-weight: 600;">
                  ${
                    chamadosEntorno.length > 0
                      ? `⚠️ ${chamadosEntorno.length} chamado(s) no entorno`
                      : '✅ Nenhum chamado recente'
                  }
                </span>
                <span style="font-size: 10px; color: #94a3b8;">Trindade - GO</span>
              </div>

              ${
                onEditOrgao || onDeleteOrgao
                  ? `
                <div style="display: flex; gap: 6px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                  ${
                    onEditOrgao
                      ? `<button id="btn-edit-orgao-${orgao.id}" style="flex: 1; background: #006653; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                          ✏️ Editar Órgão
                        </button>`
                      : ''
                  }
                  ${
                    onDeleteOrgao
                      ? `<button id="btn-del-orgao-${orgao.id}" title="Remover órgão do mapa" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                          🗑️
                        </button>`
                      : ''
                  }
                </div>`
                  : ''
              }
            </div>
          `;

          marker.bindPopup(popupContent, { maxWidth: 300 });
          marker.on('popupopen', () => {
            if (onEditOrgao) {
              const btnEdit = document.getElementById(`btn-edit-orgao-${orgao.id}`);
              if (btnEdit) btnEdit.onclick = () => onEditOrgao(orgao);
            }
            if (onDeleteOrgao) {
              const btnDel = document.getElementById(`btn-del-orgao-${orgao.id}`);
              if (btnDel) btnDel.onclick = () => onDeleteOrgao(orgao.id);
            }
          });
          marker.on('click', () => setSelectedOrgaoInfo(orgao));

          orgaosLayer.addLayer(marker);
          markerLookupRef.current.set(`orgao-${orgao.id}`, marker);
        });
      }

      // ==========================================
      // 2. ADICIONAR MARCADORES DOS CHAMADOS
      // ==========================================
      if (showChamados) {
        chamados.forEach((c) => {
          const catInfo = getCategoriaInfo(c.categoria);
          const statusInfo = getStatusInfo(c.status);
          const isAtrasado =
            c.sla_limite &&
            new Date(c.sla_limite) < new Date() &&
            c.status !== 'RESOLVIDO' &&
            c.status !== 'REJEITADO';

          // Cores por status
          const statusColors: Record<string, { bg: string; border: string; text: string }> = {
            ABERTO: { bg: '#d97706', border: '#ffffff', text: '#d97706' },
            TRIADO: { bg: '#8b5cf6', border: '#ffffff', text: '#8b5cf6' },
            EM_ANDAMENTO: { bg: '#2563eb', border: '#ffffff', text: '#2563eb' },
            RESOLVIDO: { bg: '#16a34a', border: '#ffffff', text: '#16a34a' },
            REJEITADO: { bg: '#ef4444', border: '#ffffff', text: '#ef4444' },
            AVALIADO: { bg: '#0d9488', border: '#ffffff', text: '#0d9488' },
          };

          const sColor = statusColors[c.status] || { bg: '#6b7280', border: '#ffffff', text: '#6b7280' };

          // Ícone em formato de pin com o emoji da categoria
          const icon = L.divIcon({
            className: 'chamado-marker-pin',
            html: `
              <div style="position: relative; width: 34px; height: 42px;">
                <div class="${c.status === 'ABERTO' || isAtrasado ? 'marker-pulse' : ''}" style="
                  width: 34px;
                  height: 34px;
                  border-radius: 50% 50% 50% 0;
                  background: ${isAtrasado ? '#dc2626' : sColor.bg};
                  transform: rotate(-45deg);
                  position: absolute;
                  top: 0;
                  left: 0;
                  border: 2.5px solid #ffffff;
                  box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <span style="
                    transform: rotate(45deg);
                    font-size: 15px;
                    display: block;
                    line-height: 1;
                  ">${catInfo?.emoji || '📋'}</span>
                </div>
              </div>
            `,
            iconSize: [34, 42],
            iconAnchor: [17, 42],
            popupAnchor: [0, -38],
          });

          const marker = L.marker([c.latitude, c.longitude], { icon });

          // Tooltip dinâmico
          marker.bindTooltip(
            `<strong>${catInfo?.emoji || '📋'} ${c.protocolo}</strong> - ${catInfo?.label || c.categoria}`,
            { direction: 'top', offset: [0, -40] }
          );

          // Popup com foto, dados e ação de despacho
          const popupHtml = `
            <div style="width: 270px; font-family: sans-serif; padding: 12px; color: #1e293b;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 20px;">${catInfo?.emoji || '📋'}</span>
                  <span style="font-weight: 700; font-size: 13px; color: #173b32;">${c.protocolo}</span>
                </div>
                <span style="
                  font-size: 10px;
                  font-weight: 700;
                  padding: 2px 8px;
                  border-radius: 9999px;
                  background: ${sColor.bg}20;
                  color: ${sColor.bg};
                  border: 1px solid ${sColor.bg}40;
                ">
                  ${statusInfo.label}
                </span>
              </div>

              ${
                c.fotos && c.fotos.length > 0
                  ? `<div style="width: 100%; height: 90px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
                      <img src="${c.fotos[0]}" alt="Foto do chamado" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>`
                  : ''
              }

              <div style="font-size: 12px; margin-bottom: 6px;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">${catInfo?.label || c.categoria}</p>
                <p style="margin: 0; color: #64748b; font-size: 11px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${c.descricao}
                </p>
              </div>

              <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; font-size: 10.5px; color: #475569; margin-bottom: 8px;">
                📍 <strong>Local:</strong> ${c.endereco_texto || 'Sem endereço detalhado'}
              </div>

              ${
                isAtrasado
                  ? `<div style="background: #fef2f2; color: #b91c1c; padding: 4px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                      ⚠️ SLA Limite Atrasado
                    </div>`
                  : ''
              }

              <button
                id="btn-chamado-${c.id}"
                style="
                  width: 100%;
                  background: #006653;
                  color: white;
                  border: none;
                  padding: 7px 12px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                "
              >
                Gerenciar e Atualizar Status
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
      }
    })();
  }, [chamados, orgaosFiltrados, showChamados, showOrgaos, onSelect, onEditOrgao, onDeleteOrgao]);

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

    const orgaosMatches = ORGAOS_PUBLICOS_TRINDADE.filter(
      (o) =>
        o.nome.toLowerCase().includes(q) ||
        o.tipoLabel.toLowerCase().includes(q) ||
        o.bairro.toLowerCase().includes(q)
    ).map((o) => ({
      tipo: 'orgao' as const,
      id: o.id,
      titulo: o.nome,
      subtitulo: `${o.tipoLabel} - ${o.bairro}`,
      emoji: o.emoji,
      lat: o.latitude,
      lng: o.longitude,
      key: `orgao-${o.id}`,
    }));

    const chamadosMatches = chamados
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
        emoji: getCategoriaInfo(c.categoria)?.emoji || '📋',
        lat: c.latitude,
        lng: c.longitude,
        key: `chamado-${c.id}`,
      }));

    return [...orgaosMatches, ...chamadosMatches].slice(0, 8);
  }, [searchQuery, chamados]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200">
      {/* Contêiner principal do Leaflet */}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* BARRA SUPERIOR DE FILTROS E CAMADAS (Floating Overlay) */}
      <div className="absolute top-3 left-3 right-14 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Campo de Busca Rápida de Prédios e Chamados */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar órgão, CMEI, UBS, O.S...."
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
                  <span className="text-base flex-shrink-0">{item.emoji}</span>
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 truncate">{item.titulo}</p>
                    <p className="text-[10.5px] text-gray-500 truncate">{item.subtitulo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggles Rápidos de Camadas */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-gray-200 shadow-md text-xs">
          {/* Toggle Chamados */}
          <button
            onClick={() => setShowChamados(!showChamados)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              showChamados
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Mostrar/Ocultar chamados no mapa"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Chamados ({chamados.length})</span>
          </button>

          {/* Toggle Órgãos Públicos */}
          <button
            onClick={() => setShowOrgaos(!showOrgaos)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              showOrgaos
                ? 'bg-[#006653] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Mostrar/Ocultar prédios e órgãos públicos"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Órgãos ({orgaosFiltrados.length})</span>
          </button>

          {/* Filtro do Tipo de Órgão */}
          {showOrgaos && (
            <div className="relative">
              <button
                onClick={() => setActiveFilterPopover(!activeFilterPopover)}
                className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
              >
                <Filter className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {selectedTipoOrgao === 'TODOS' ? 'Todos os órgãos' : selectedTipoOrgao}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {activeFilterPopover && (
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-52 z-50">
                  {CATEGORIAS_ORGAOS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedTipoOrgao(cat.id as any);
                        setActiveFilterPopover(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-gray-50 ${
                        selectedTipoOrgao === cat.id
                          ? 'font-bold text-[#006653] bg-emerald-50/50'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      {selectedTipoOrgao === cat.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LEGENDA VISUAL COMPLETA NO CANTO INFERIOR ESQUERDO */}
      <div className="absolute bottom-4 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-emerald-100 text-[11px] text-gray-700 space-y-1.5 max-w-xs">
        <div className="flex items-center gap-2 font-bold text-[#173b32] text-xs pb-1 border-b border-gray-200">
          <span className="inline-block w-5 h-0 border-t-2 border-dashed border-[#006653]" />
          <span>Trindade - GO | Limites & Prédios</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Chamados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏛️</span>
            <span>Prefeitura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏥</span>
            <span>UBS & Hospitais</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏫</span>
            <span>Escolas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>👶</span>
            <span>CMEIs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🌳</span>
            <span>Parques & Praças</span>
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
