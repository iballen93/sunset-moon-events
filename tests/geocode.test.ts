import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces, toPlaceResult } from '../src/geocode';

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
