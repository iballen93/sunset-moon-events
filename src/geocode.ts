import type { Location } from './astro';

/**
 * Place search by city name or postal code, using the free Open-Meteo geocoding API
 * (no key needed, allows browser requests). "Portland, ME" and "90210" both work.
 */
const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export interface PlaceResult extends Location {
  /** Second line under the place name, e.g. "Maine, United States". */
  detail: string;
}

interface ApiPlace {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country?: string;
}

export function toPlaceResult(p: ApiPlace): PlaceResult {
  const region = [p.admin1, p.country].filter(Boolean).join(', ');
  return {
    latitude: p.latitude,
    longitude: p.longitude,
    label: p.admin1 ? `${p.name}, ${p.admin1}` : p.name,
    detail: p.admin2 && p.admin2 !== p.name ? `${p.admin2}, ${region}` : region,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as { results?: ApiPlace[] };
  return (data.results ?? []).map(toPlaceResult);
}

/**
 * Reverse lookup (coordinates → "City, State") for a location from the device's GPS,
 * using BigDataCloud's free client-side endpoint (no key needed, allows browser requests).
 */
const REVERSE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** The label shown for a GPS location before (or if) its place name is known. */
export const GPS_LABEL = 'Current location';

interface ReverseResult {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

/** "Montrose, Colorado"; outside a state/province, or where it repeats the city, "Paris, France". */
export function reverseLabel(r: ReverseResult): string | null {
  const city = r.city || r.locality;
  const region = r.principalSubdivision && r.principalSubdivision !== city ? r.principalSubdivision : r.countryName;
  if (city && region) return `${city}, ${region}`;
  return city || region || null;
}

/** The place name for a coordinate, or null if it can't be looked up (offline, slow, nothing nearby). */
export async function placeNameFor(latitude: number, longitude: number, timeoutMs = 6000): Promise<string | null> {
  try {
    const url = `${REVERSE_ENDPOINT}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return reverseLabel((await res.json()) as ReverseResult);
  } catch {
    return null;
  }
}
