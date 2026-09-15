import rawGeoJson from './trindade-geojson.json';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export const TRINDADE_GEOJSON: GeoJsonPolygon = rawGeoJson as GeoJsonPolygon;
