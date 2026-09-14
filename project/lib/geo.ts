// Limites geográficos do município de Trindade-GO
export const TRINDADE_BOUNDS = {
  minLat: -16.75,
  maxLat: -16.55,
  minLng: -49.65,
  maxLng: -49.35,
};

export const TRINDADE_CENTER = {
  lat: -16.6528,
  lng: -49.4896,
};

export function isWithinTrindade(lat: number, lng: number): boolean {
  return (
    lat >= TRINDADE_BOUNDS.minLat &&
    lat <= TRINDADE_BOUNDS.maxLat &&
    lng >= TRINDADE_BOUNDS.minLng &&
    lng <= TRINDADE_BOUNDS.maxLng
  );
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
