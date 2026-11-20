import { afterEach, describe, expect, it, vi } from 'vitest';
import { gpsLabel, placeNameFor, reverseLabel, searchPlaces, toPlaceResult, upgradedGpsLabel } from '../src/geocode';

afterEach(() => vi.unstubAllGlobals());

describe('toPlaceResult', () => {
  it('labels a place with its state and lists county and country below', () => {
    expect(toPlaceResult({
      name: 'Beverly Hills', latitude: 34.07362, longitude: -118.40036,
      admin1: 'California', admin2: 'Los Angeles', country: 'United States',
    })).toEqual({
      latitude: 34.07362, longitude: -118.40036,
      label: 'Beverly Hills, California', detail: 'Los Angeles, California, United States',
    });
  });

  it('copes with a place that has no state or county', () => {
    expect(toPlaceResult({ name: 'Monaco', latitude: 43.73, longitude: 7.42, country: 'Monaco' }))
      .toMatchObject({ label: 'Monaco', detail: 'Monaco' });
  });
});

describe('searchPlaces', () => {
  it('does not search for fewer than 2 characters', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces(' a ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the query and returns no places when nothing matches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces('Portland, ME')).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toContain('name=Portland%2C%20ME');
  });

  it('reports a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(searchPlaces('90210')).rejects.toThrow('503');
  });
});

describe('reverseLabel', () => {
  it('names a US place by city and state', () => {
    expect(reverseLabel({ city: 'Montrose', locality: 'Montrose', principalSubdivision: 'Colorado', countryName: 'United States of America' }))
      .toBe('Montrose, Colorado');
  });
  it('uses the country when the state would repeat the city', () => {
    expect(reverseLabel({ city: 'Paris', locality: 'Saint-Merri', principalSubdivision: 'Paris', countryName: 'France' })).toBe('Paris, France');
  });
  it('falls back to the locality, and to nothing when nothing is known', () => {
    expect(reverseLabel({ city: '', locality: 'Ouray', principalSubdivision: 'Colorado' })).toBe('Ouray, Colorado');
    expect(reverseLabel({})).toBeNull();
  });
});

describe('placeNameFor', () => {
  it('returns null instead of failing when the lookup is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await placeNameFor(38.45, -107.86)).toBeNull();
  });
});

describe('GPS location labels', () => {
  it('keeps "Current location" and adds the place name', () => {
    expect(gpsLabel('Montrose, Colorado')).toBe('Current location · Montrose, Colorado');
    expect(gpsLabel(null)).toBe('Current location');
  });

  it('puts "Current location" back on a GPS location saved as a bare city and state', async () => {
    expect(await upgradedGpsLabel({ latitude: 38.45045045045045, longitude: -107.85785168349221, label: 'Montrose, Colorado' }))
      .toBe('Current location · Montrose, Colorado');
  });

  it('looks up the place for a GPS location saved without one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ city: 'Montrose', principalSubdivision: 'Colorado' }),
    }));
    expect(await upgradedGpsLabel({ latitude: 38.4505, longitude: -107.8579, label: 'Current location' }))
      .toBe('Current location · Montrose, Colorado');
  });

  it('leaves searched, typed and already-labelled locations alone', async () => {
    expect(await upgradedGpsLabel({ latitude: 34.07362, longitude: -118.40036, label: 'Beverly Hills, California' })).toBeNull();
    expect(await upgradedGpsLabel({ latitude: 38.450450450, longitude: -107.857851683, label: '38.45, -107.86' })).toBeNull();
    expect(await upgradedGpsLabel({ latitude: 38.45045045045045, longitude: -107.85785168349221, label: 'Current location · Montrose, Colorado' }))
      .toBeNull();
  });
});
