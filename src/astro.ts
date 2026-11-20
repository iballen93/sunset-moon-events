import { Body, Illumination, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine';

const MIN = 60_000;

/** Event windows, in minutes relative to sunset. */
/** Minutes relative to sunset (negative = before). */
export interface TimeWindow {
  start: number;
  end: number;
}

/** How close to sunset the moonrise (full moon) and moonset (young crescent) must be to count. */
export interface EventWindows {
  full: TimeWindow;
  crescent: TimeWindow;
}

export const FULL_MOON_WINDOW: TimeWindow = { start: -60, end: 60 }; // moonrise within ±1h of sunset
export const NEW_MOON_WINDOW: TimeWindow = { start: 30, end: 150 }; // moonset 30 min – 2.5 h after sunset
export const DEFAULT_WINDOWS: EventWindows = { full: FULL_MOON_WINDOW, crescent: NEW_MOON_WINDOW };

/** The widest each window can be set (the slider ends); "Show all events" uses these. */
export const MAX_WINDOWS: EventWindows = {
  full: { start: -180, end: 180 }, // moonrise up to 3 h either side of sunset
  crescent: { start: 0, end: 240 }, // moonset up to 4 h after sunset
};

export interface Location {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface DayInfo {
  date: Date; // local midnight
  sunrise: Date | null;
  sunset: Date | null;
  moonrise: Date | null; // first moonrise on this calendar day
  moonset: Date | null; // first moonset on this calendar day
  /** Moon illumination (0–1) at sunset, or at noon if the sun doesn't set. */
  illumination: number;
  /** Ecliptic phase angle 0–360 (0 = new, 180 = full). */
  phaseAngle: number;
  phaseName: string;
  /** Set when moonrise falls within ±1h of sunset. */
  fullMoonEvent: { moonrise: Date; offsetMin: number } | null;
  /** Set when moonset falls 30–150 min after sunset. */
  newMoonEvent: { moonset: Date; offsetMin: number; illumination: number } | null;
}

const toDate = (t: { date: Date } | null) => (t ? t.date : null);

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * MIN);
}

/** Find a rise (+1) or set (-1) of a body between [from, to). */
function findBetween(body: Body, obs: Observer, direction: 1 | -1, from: Date, to: Date): Date | null {
  const limitDays = (to.getTime() - from.getTime()) / 86_400_000;
  const t = toDate(SearchRiseSet(body, obs, direction, from, limitDays));
  return t && t < to ? t : null;
}

export function phaseName(angle: number): string {
  if (angle < 6 || angle >= 354) return 'New Moon';
  if (angle < 84) return 'Waxing Crescent';
  if (angle < 96) return 'First Quarter';
  if (angle < 174) return 'Waxing Gibbous';
  if (angle < 186) return 'Full Moon';
  if (angle < 264) return 'Waning Gibbous';
  if (angle < 276) return 'Last Quarter';
  return 'Waning Crescent';
}

export function analyzeDay(date: Date, loc: Location, windows: EventWindows = DEFAULT_WINDOWS): DayInfo {
  const obs = new Observer(loc.latitude, loc.longitude, 0);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  const sunrise = findBetween(Body.Sun, obs, 1, start, end);
  const sunset = findBetween(Body.Sun, obs, -1, start, end);
  const moonrise = findBetween(Body.Moon, obs, 1, start, end);
  const moonset = findBetween(Body.Moon, obs, -1, start, end);

  const ref = sunset ?? addMinutes(start, 12 * 60);
  const illumination = Illumination(Body.Moon, ref).phase_fraction;
  const phaseAngle = MoonPhase(ref);

  let fullMoonEvent: DayInfo['fullMoonEvent'] = null;
  let newMoonEvent: DayInfo['newMoonEvent'] = null;

  if (sunset) {
    // Search around sunset directly (the qualifying moonrise/moonset may fall on the next calendar day).
    const rise = findBetween(
      Body.Moon, obs, 1,
      addMinutes(sunset, windows.full.start),
      addMinutes(sunset, windows.full.end + 0.01),
    );
    if (rise) {
      fullMoonEvent = { moonrise: rise, offsetMin: (rise.getTime() - sunset.getTime()) / MIN };
    }

    const set = findBetween(
      Body.Moon, obs, -1,
      addMinutes(sunset, windows.crescent.start),
      addMinutes(sunset, windows.crescent.end + 0.01),
    );
    // Moonset shortly after sunset only happens for a moon just east of the sun, i.e. a young
    // waxing crescent. Guard on phase angle anyway so a polar-latitude oddity can't sneak in.
    const setPhase = set ? MoonPhase(set) : 0;
    if (set && setPhase < 90) {
      newMoonEvent = {
        moonset: set,
        offsetMin: (set.getTime() - sunset.getTime()) / MIN,
        illumination: Illumination(Body.Moon, set).phase_fraction,
      };
    }
  }

  // Likewise a moonrise near sunset implies a moon near opposition (full). Guard on phase.
  if (fullMoonEvent && (phaseAngle < 135 || phaseAngle > 225)) fullMoonEvent = null;

  return {
    date: start, sunrise, sunset, moonrise, moonset,
    illumination, phaseAngle, phaseName: phaseName(phaseAngle),
    fullMoonEvent, newMoonEvent,
  };
}

export function analyzeMonth(year: number, month: number, loc: Location, windows: EventWindows = DEFAULT_WINDOWS): DayInfo[] {
  const days = new Date(year, month + 1, 0).getDate();
  const out: DayInfo[] = [];
  for (let d = 1; d <= days; d++) out.push(analyzeDay(new Date(year, month, d), loc, windows));
  return out;
}
