import { describe, it, expect } from 'vitest';
import { analyzeMonth, FULL_MOON_WINDOW, NEW_MOON_WINDOW } from '../src/astro';

const NYC = { latitude: 40.7128, longitude: -74.006 };

describe('analyzeMonth', () => {
  for (let m = 0; m < 12; m++) {
    it(`2026-${m + 1}: event days respect windows`, () => {
      const days = analyzeMonth(2026, m, NYC);
      const full = days.filter(d => d.fullMoonEvent);
      const nw = days.filter(d => d.newMoonEvent);
      console.log(`2026-${m + 1}`,
        'full:', full.map(d => `${d.date.getDate()}(${Math.round(d.fullMoonEvent!.offsetMin)}m ${(d.illumination*100).toFixed(0)}%)`).join(' '),
        '| new:', nw.map(d => `${d.date.getDate()}(+${Math.round(d.newMoonEvent!.offsetMin)}m ${(d.newMoonEvent!.illumination*100).toFixed(1)}%)`).join(' '));
      for (const d of full) {
        expect(d.fullMoonEvent!.offsetMin).toBeGreaterThanOrEqual(FULL_MOON_WINDOW.start);
        expect(d.fullMoonEvent!.offsetMin).toBeLessThanOrEqual(FULL_MOON_WINDOW.end);
        expect(d.illumination).toBeGreaterThan(0.85);
      }
      for (const d of nw) {
        expect(d.newMoonEvent!.offsetMin).toBeGreaterThanOrEqual(NEW_MOON_WINDOW.start);
        expect(d.newMoonEvent!.offsetMin).toBeLessThanOrEqual(NEW_MOON_WINDOW.end);
        expect(d.newMoonEvent!.illumination).toBeLessThan(0.4);
      }
      expect(full.length).toBeGreaterThan(0);
      expect(nw.length).toBeGreaterThan(0);
    });
  }
});

import { computeCarEvents } from '../src/carExport';

describe('computeCarEvents', () => {
  it('produces a year of events matching the calendar logic, quickly', () => {
    const t0 = performance.now();
    const ev = computeCarEvents(NYC, new Date(2026, 10, 1), 365);
    const ms = performance.now() - t0;
    console.log(`365 days in ${ms.toFixed(0)}ms, ${ev.length} events; first:`, JSON.stringify(ev.slice(0, 2)));
    expect(ev.filter(e => e.type === 'full').length).toBeGreaterThan(24);
    expect(ev.filter(e => e.type === 'new').length).toBeGreaterThan(24);
    expect(ev.find(e => e.date === '2026-11-24' && e.type === 'full')?.offsetMin).toBe(-16);
  });
});
