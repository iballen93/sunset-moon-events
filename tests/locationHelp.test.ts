import { describe, expect, it } from 'vitest';
import { blockedLocationHelp, isPermissionDenied } from '../src/locationHelp';

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 16; SM-S908U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 16; SM-S908U1) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/138.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

describe('isPermissionDenied', () => {
  it('recognises the browser refusing permission', () => {
    expect(isPermissionDenied({ code: 1, message: 'User denied Geolocation' })).toBe(true);
    expect(isPermissionDenied(new Error('Location permission was denied'))).toBe(true);
  });
  it('does not treat a timeout or missing signal as a refusal', () => {
    expect(isPermissionDenied({ code: 3, message: 'Timeout expired' })).toBe(false);
    expect(isPermissionDenied({ code: 2, message: 'Position unavailable' })).toBe(false);
  });
});

describe('blockedLocationHelp', () => {
  it('points Chrome on Android to Site controls in the ⋮ menu', () => {
    const h = blockedLocationHelp('web', CHROME_ANDROID);
    expect(h.title).toMatch(/blocked for this site/);
    expect(h.steps.join(' ')).toMatch(/⋮ menu.*Site controls.*Permissions.*Location switch/);
  });
  it('has separate steps for Samsung Internet, iPhone Safari and desktop browsers', () => {
    expect(blockedLocationHelp('web', SAMSUNG).steps.join(' ')).toMatch(/Site permissions/);
    expect(blockedLocationHelp('web', IPHONE).steps.join(' ')).toMatch(/Website Settings/);
    expect(blockedLocationHelp('web', DESKTOP).steps[0]).toMatch(/^Click/);
  });
  it('sends the installed apps to the phone settings', () => {
    expect(blockedLocationHelp('android', CHROME_ANDROID).steps[0]).toMatch(/Apps → Sunset Moon Events/);
    expect(blockedLocationHelp('ios', IPHONE).steps[0]).toMatch(/Location Services → Sunset Moon Events/);
  });
});
