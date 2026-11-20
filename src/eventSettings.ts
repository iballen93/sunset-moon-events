import { DEFAULT_WINDOWS, MAX_WINDOWS, type EventWindows, type TimeWindow } from './astro';

/** The user's event windows (the sliders under the calendar), kept on this device. */
const STORAGE_KEY = 'sunsetmoonevents.windows';

const clampWindow = (w: Partial<TimeWindow> | undefined, def: TimeWindow, max: TimeWindow): TimeWindow => {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const start = Math.min(Math.max(num(w?.start, def.start), max.start), max.end);
  const end = Math.min(Math.max(num(w?.end, def.end), max.start), max.end);
  return start <= end ? { start, end } : { start: end, end: start };
};

/** Keeps saved values inside the slider range, falling back to the defaults for anything missing. */
export function normalizeWindows(w: Partial<EventWindows> | null | undefined): EventWindows {
  return {
    full: clampWindow(w?.full, DEFAULT_WINDOWS.full, MAX_WINDOWS.full),
    crescent: clampWindow(w?.crescent, DEFAULT_WINDOWS.crescent, MAX_WINDOWS.crescent),
  };
}

export function loadWindows(): EventWindows {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeWindows(raw ? (JSON.parse(raw) as Partial<EventWindows>) : null);
  } catch {
    return DEFAULT_WINDOWS;
  }
}

export function saveWindows(w: EventWindows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
  } catch {
    /* storage unavailable; the setting just won't persist */
  }
}

export const sameWindows = (a: EventWindows, b: EventWindows) =>
  a.full.start === b.full.start && a.full.end === b.full.end
  && a.crescent.start === b.crescent.start && a.crescent.end === b.crescent.end;

/** "1h", "30m", "2h 30m". */
export function fmtDuration(min: number): string {
  const abs = Math.round(Math.abs(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Plain-English description of a window around sunset, e.g. "within ±1h of sunset". */
export function describeWindow({ start, end }: TimeWindow): string {
  if (start === end) {
    if (start === 0) return 'at sunset';
    return `${fmtDuration(start)} ${start < 0 ? 'before' : 'after'} sunset`;
  }
  if (start < 0 && end > 0) {
    return -start === end
      ? `within ±${fmtDuration(end)} of sunset`
      : `from ${fmtDuration(start)} before to ${fmtDuration(end)} after sunset`;
  }
  if (end <= 0) {
    return end === 0 ? `within ${fmtDuration(start)} before sunset` : `${fmtDuration(end)}–${fmtDuration(start)} before sunset`;
  }
  return start === 0 ? `within ${fmtDuration(end)} after sunset` : `${fmtDuration(start)}–${fmtDuration(end)} after sunset`;
}
