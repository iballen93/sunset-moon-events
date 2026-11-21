import { describe, expect, it } from 'vitest';
import { analyzeMonth, DEFAULT_WINDOWS, MAX_WINDOWS } from '../src/astro';
import { describeWindow, fmtDuration, normalizeWindows, sameWindows } from '../src/eventSettings';

const NYC = { latitude: 40.7128, longitude: -74.006 };

describe('describeWindow', () => {
  it('describes the default windows the way the calendar always has', () => {
    expect(describeWindow(DEFAULT_WINDOWS.full)).toBe('within ±1h of sunset');
    expect(describeWindow(DEFAULT_WINDOWS.crescent)).toBe('30m–2h 30m after sunset');
  });
  it('describes uneven, before-only, after-only and single-point windows', () => {
    expect(describeWindow({ start: -30, end: 90 })).toBe('from 30m before to 1h 30m after sunset');
    expect(describeWindow({ start: -90, end: -30 })).toBe('30m–1h 30m before sunset');
    expect(describeWindow({ start: -45, end: 0 })).toBe('within 45m before sunset');
    expect(describeWindow({ start: 0, end: 240 })).toBe('within 4h after sunset');
    expect(describeWindow({ start: 0, end: 0 })).toBe('at sunset');
    expect(describeWindow({ start: 20, end: 20 })).toBe('20m after sunset');
  });
  it('formats durations', () => {
    expect([fmtDuration(30), fmtDuration(60), fmtDuration(150), fmtDuration(-75)]).toEqual(['30m', '1h', '2h 30m', '1h 15m']);
  });
});

describe('normalizeWindows', () => {
  it('fills in defaults and keeps saved values inside the slider range', () => {
    expect(normalizeWindows(null)).toEqual(DEFAULT_WINDOWS);
    expect(normalizeWindows({ full: { start: -999, end: 30 } } as never)).toEqual({
      full: { start: MAX_WINDOWS.full.start, end: 30 },
      crescent: DEFAULT_WINDOWS.crescent,
    });
    expect(normalizeWindows({ full: { start: 40, end: -40 }, crescent: { start: 'x', end: 999 } } as never)).toEqual({
      full: { start: -40, end: 40 },
      crescent: { start: DEFAULT_WINDOWS.crescent.start, end: MAX_WINDOWS.crescent.end },
    });
  });
  it('compares windows by value', () => {
    expect(sameWindows(normalizeWindows(null), DEFAULT_WINDOWS)).toBe(true);
    expect(sameWindows(DEFAULT_WINDOWS, MAX_WINDOWS)).toBe(false);
  });
});

describe('windows applied to the calendar', () => {
  const count = (w: typeof DEFAULT_WINDOWS) => {
    let full = 0, crescent = 0;
    for (let m = 0; m < 12; m++) {
      for (const d of analyzeMonth(2026, m, NYC, w)) {
        if (d.fullMoonEvent) {
          full++;
          expect(d.fullMoonEvent.offsetMin).toBeGreaterThanOrEqual(w.full.start);
          expect(d.fullMoonEvent.offsetMin).toBeLessThanOrEqual(w.full.end);
        }
        if (d.newMoonEvent) {
          crescent++;
          expect(d.newMoonEvent.offsetMin).toBeGreaterThanOrEqual(w.crescent.start);
          expect(d.newMoonEvent.offsetMin).toBeLessThanOrEqual(w.crescent.end);
        }
      }
    }
    return { full, crescent };
  };

  it('shows more days with Show all events and fewer with narrow windows, always within the window', () => {
    const def = count(DEFAULT_WINDOWS);
    const all = count(MAX_WINDOWS);
    const narrow = count({ full: { start: -15, end: 15 }, crescent: { start: 45, end: 60 } });
    console.log('2026 NYC days — default', def, 'all', all, 'narrow', narrow);
    expect(all.full).toBeGreaterThan(def.full);
    expect(all.crescent).toBeGreaterThan(def.crescent);
    expect(narrow.full).toBeLessThan(def.full);
    expect(narrow.crescent).toBeLessThan(def.crescent);
  });
});

describe('Show all events (moonrise and moonset nearest sunset)', () => {
  it('fills in every day, within 12 h of sunset, only when asked', () => {
    const plain = analyzeMonth(2026, 10, NYC);
    expect(plain.every((d) => d.nearSunset === undefined)).toBe(true);

    const all = analyzeMonth(2026, 10, NYC, DEFAULT_WINDOWS, { nearSunset: true });
    expect(all).toHaveLength(30);
    for (const d of all) {
      expect(d.nearSunset).toBeDefined();
      for (const m of [d.nearSunset!.moonriseMin, d.nearSunset!.moonsetMin]) {
        if (m !== null) expect(Math.abs(m)).toBeLessThanOrEqual(12 * 60);
      }
    }
    // Nearly every day has both; the moon's ~24 h 50 m cycle leaves at most a day or two without one.
    expect(all.filter((d) => d.nearSunset!.moonriseMin !== null).length).toBeGreaterThanOrEqual(28);
    expect(all.filter((d) => d.nearSunset!.moonsetMin !== null).length).toBeGreaterThanOrEqual(28);
  });

  it('agrees with the event days: the full-moon and crescent offsets match', () => {
    for (const d of analyzeMonth(2026, 10, NYC, DEFAULT_WINDOWS, { nearSunset: true })) {
      if (d.fullMoonEvent) expect(d.nearSunset!.moonriseMin).toBeCloseTo(d.fullMoonEvent.offsetMin, 1);
      if (d.newMoonEvent) expect(d.nearSunset!.moonsetMin).toBeCloseTo(d.newMoonEvent.offsetMin, 1);
    }
  });
});
