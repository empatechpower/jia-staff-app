import { GEOFENCE_RADIUS_METERS, OFFICE_LOCATION } from "./config";

export type LatLng = { lat: number; lng: number };

// Haversine great-circle distance in metres.
export function distanceInMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// HR project geolocations are stored as "Place Name|lat|lng", newline-separated.
export function parseGeoTagCoords(tag: string): LatLng | null {
  const parts = tag.split("|");
  const lat = Number(parts[1]);
  const lng = Number(parts[2]);
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

export function splitGeolocations(raw: unknown): string[] {
  const s = String(raw ?? "");
  if (!s) return [];
  const sep = s.includes("\n") ? "\n" : ",";
  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

export function nearestDistance(from: LatLng, targets: LatLng[]): number | null {
  if (targets.length === 0) return null;
  return Math.min(...targets.map((t) => distanceInMeters(from, t)));
}

export function isWithinRadius(distance: number | null): boolean {
  return distance !== null && distance <= GEOFENCE_RADIUS_METERS;
}

export { OFFICE_LOCATION, GEOFENCE_RADIUS_METERS };
