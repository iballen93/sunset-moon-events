import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { analyzeDay, type Location } from './astro';

/**
 * Precomputes upcoming qualifying evenings and saves them to native storage so the
 * Android Auto screen (native Java, see android/.../car/) can show them without
 * re-implementing the astronomy. Read natively from SharedPreferences "CapacitorStorage".
 */
export const CAR_EVENTS_KEY = 'sunsetmoonevents.carEvents';
const MONTHS_AHEAD = 12; // current month + 12 more
const REFRESH_AFTER_DAYS = 30;

export interface CarEvent {
  date: string; // YYYY-MM-DD (local)
  type: 'full' | 'new';
  sunrise: number | null; // epoch ms
  sunset: number;
  moonTime: number; // moonrise (full) or moonset (new)
  offsetMin: number;
  illumination: number; // 0–1
  phaseName: string;
}

interface CarPayload {
  version: 2;
  generatedAt: number;
  startDate: string; // first day covered (1st of the month it was generated in)
  endDate: string; // last day covered
  location: Location;
  events: CarEvent[];
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export function computeCarEvents(loc: Location, from: Date, days: number): CarEvent[] {
  const events: CarEvent[] = [];
  for (let i = 0; i < days; i++) {
    const day = analyzeDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i), loc);
    if (!day.sunset) continue;
    const base = {
      date: ymd(day.date),
      sunrise: day.sunrise?.getTime() ?? null,
      sunset: day.sunset.getTime(),
      phaseName: day.phaseName,
    };
    if (day.fullMoonEvent) {
      events.push({
        ...base, type: 'full',
        moonTime: day.fullMoonEvent.moonrise.getTime(),
        offsetMin: Math.round(day.fullMoonEvent.offsetMin),
        illumination: day.illumination,
      });
    }
    if (day.newMoonEvent) {
      events.push({
        ...base, type: 'new',
        moonTime: day.newMoonEvent.moonset.getTime(),
        offsetMin: Math.round(day.newMoonEvent.offsetMin),
        illumination: day.newMoonEvent.illumination,
      });
    }
  }
  return events;
}

/** Recompute when the location changed or the saved data is getting old. Android only. */
export async function syncCarEvents(loc: Location, force = false): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    if (!force) {
      const { value } = await Preferences.get({ key: CAR_EVENTS_KEY });
      if (value) {
        const saved = JSON.parse(value) as CarPayload;
        const sameLoc = saved.location.latitude === loc.latitude && saved.location.longitude === loc.longitude;
        const ageDays = (Date.now() - saved.generatedAt) / 86_400_000;
        const sameMonth = saved.startDate === ymd(monthStart(new Date()));
        if (saved.version === 2 && sameLoc && sameMonth && ageDays < REFRESH_AFTER_DAYS) return;
      }
    }
    const start = monthStart(new Date());
    const end = new Date(start.getFullYear(), start.getMonth() + MONTHS_AHEAD + 1, 0); // last day of month +12
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const payload: CarPayload = {
      version: 2,
      generatedAt: Date.now(),
      startDate: ymd(start),
      endDate: ymd(end),
      location: loc,
      events: computeCarEvents(loc, start, days),
    };
    await Preferences.set({ key: CAR_EVENTS_KEY, value: JSON.stringify(payload) });
  } catch (e) {
    console.warn('Could not save Android Auto data', e);
  }
}
