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
import {
  iconeCategoria,
  iconeOrgao,
  corDoStatus,
  LEGENDA_STATUS,
  pinoHtml,
  pontoHtml,
  iconeInlineHtml,
  TAMANHO_PINO,
  ANCORA_PINO,
  TAMANHO_PONTO,
  ANCORA_PONTO,
} from '@/lib/map-icons';
import { escapeHtml as esc } from '@/lib/utils';
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
  // O Leaflet carrega de forma assíncrona: só desenhamos os marcadores
  // depois que o mapa e as camadas existem.
  const [mapaPronto, setMapaPronto] = useState(false);
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

          const IconeOrgao = iconeOrgao(orgao.tipo);
          const icon = L.divIcon({
            className: 'ct-marcador',
            html: pontoHtml(IconeOrgao, orgao.cor, chamadosEntorno.length),
            iconSize: TAMANHO_PONTO,
            iconAnchor: ANCORA_PONTO,
          });

          const marker = L.marker([orgao.latitude, orgao.longitude], { icon });

          marker.bindTooltip(esc(orgao.nome), {
            className: 'orgao-tooltip',
            direction: 'top',
            offset: [0, -14],
          });

          const popupContent = `
            <div style="width: 260px; font-family: inherit; padding: 12px; color: #1f2937;">
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                ${iconeInlineHtml(IconeOrgao, orgao.cor, 18)}
                <div>
                  <h3 style="margin: 0; font-size: 14px; font-weight: 600; line-height: 1.25;">${esc(orgao.nome)}</h3>
                  <span style="font-size: 11px; color: #6b7280;">${esc(orgao.tipoLabel)}</span>
                </div>
              </div>
              <div style="font-size: 12px; color: #4b5563; line-height: 1.5;">
                <p style="margin: 2px 0;">${esc(orgao.endereco)} - ${esc(orgao.bairro)}</p>
                ${orgao.horario ? `<p style="margin: 2px 0;">Horário: ${esc(orgao.horario)}</p>` : ''}
                ${orgao.telefone ? `<p style="margin: 2px 0;">Telefone: ${esc(orgao.telefone)}</p>` : ''}
              </div>
              <p style="margin: 8px 0 0; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: ${chamadosEntorno.length > 0 ? '#b91c1c' : '#047857'};">
                ${chamadosEntorno.length > 0 ? `${chamadosEntorno.length} chamado(s) em até 600 m` : 'Nenhum chamado em até 600 m'}
              </p>
              ${
                onEditOrgao || onDeleteOrgao
                  ? `<div style="display: flex; gap: 6px; margin-top: 10px;">
                      ${onEditOrgao ? `<button id="btn-edit-orgao-${orgao.id}" style="flex: 1; background: #006653; color: #fff; border: none; padding: 6px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Editar</button>` : ''}
                      ${onDeleteOrgao ? `<button id="btn-del-orgao-${orgao.id}" style="background: #fff; color: #b91c1c; border: 1px solid #fca5a5; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Remover</button>` : ''}
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
                c.fotos && c.fotos.length > 0 && /^https:\/\//.test(c.fotos[0])
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
      }
    })();
  }, [mapaPronto, chamados, orgaosFiltrados, showChamados, showOrgaos, onSelect, onEditOrgao, onDeleteOrgao]);

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
      Icone: iconeOrgao(o.tipo),
      cor: o.cor,
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
        Icone: iconeCategoria(getCategoriaInfo(c.categoria).id),
        cor: corDoStatus(c.status).cor,
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
        <p className="font-semibold text-gray-900 mb-1.5 pt-1.5 border-t border-gray-200">Prédios públicos</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            { Icone: iconeOrgao('PREFEITURA'), label: 'Prefeitura' },
            { Icone: iconeOrgao('UBS'), label: 'Saúde' },
            { Icone: iconeOrgao('ESCOLA'), label: 'Escolas' },
            { Icone: iconeOrgao('CMEI'), label: 'CMEIs' },
            { Icone: iconeOrgao('PARQUE'), label: 'Parques' },
          ].map(({ Icone, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icone className="w-3.5 h-3.5 text-gray-500" />
              <span>{label}</span>
            </div>
          ))}
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
