import { TRINDADE_GEOJSON } from './trindade-geojson';

// Limites geográficos do município de Trindade-GO baseados na delimitação oficial (IBGE / OSM)
export const TRINDADE_BOUNDS = {
  minLat: -16.82,
  maxLat: -16.48,
  minLng: -49.71,
  maxLng: -49.37,
};

// Coordenadas dos cantos sudoeste e nordeste no formato aceito pelo Leaflet ([ [lat, lng], [lat, lng] ])
export const TRINDADE_LEAFLET_BOUNDS: [[number, number], [number, number]] = [
  [TRINDADE_BOUNDS.minLat, TRINDADE_BOUNDS.minLng],
  [TRINDADE_BOUNDS.maxLat, TRINDADE_BOUNDS.maxLng],
];

export const TRINDADE_CENTER = {
  lat: -16.6528,
  lng: -49.4896,
};

// Níveis de zoom permitidos:
// minZoom 11 garante visualização completa do município de Trindade sem afastar para o resto do estado
// maxZoom 19 permite detalhamento a nível de lote e rua
export const TRINDADE_MAP_ZOOM = {
  min: 11,
  max: 19,
  default: 13,
};

// Verificação se um ponto está dentro do polígono oficial de Trindade
function isPointInTrindadePolygon(lat: number, lng: number): boolean {
  const polygon = TRINDADE_GEOJSON.coordinates[0];
  if (!polygon || polygon.length === 0) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]; // xi = lng, yi = lat
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isWithinTrindade(lat: number, lng: number): boolean {
  if (
    lat < TRINDADE_BOUNDS.minLat ||
    lat > TRINDADE_BOUNDS.maxLat ||
    lng < TRINDADE_BOUNDS.minLng ||
    lng > TRINDADE_BOUNDS.maxLng
  ) {
    return false;
  }
  return isPointInTrindadePolygon(lat, lng);
}

// Garante que uma coordenada clicada ou arrastada permaneça estritamente nos limites de Trindade
export function clampToTrindade(lat: number, lng: number): { lat: number; lng: number } {
  const clampedLat = Math.max(TRINDADE_BOUNDS.minLat, Math.min(TRINDADE_BOUNDS.maxLat, lat));
  const clampedLng = Math.max(TRINDADE_BOUNDS.minLng, Math.min(TRINDADE_BOUNDS.maxLng, lng));
  return { lat: clampedLat, lng: clampedLng };
}

// Distância entre dois pontos em metros (Haversine)
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isDuplicate(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  createdAt2: string
): boolean {
  const dist = distanceMeters(lat1, lng1, lat2, lng2);
  const ageMs = Date.now() - new Date(createdAt2).getTime();
  return dist < 100 && ageMs < 24 * 60 * 60 * 1000;
}
