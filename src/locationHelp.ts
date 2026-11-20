/**
 * Once a browser has blocked location for a site it rejects every request at once, without
 * showing a prompt, and a page can't re-open the prompt or open the browser's settings.
 * These helpers recognise that case and give the steps to unblock it for the user's browser.
 */

/** True when a location error means permission was refused (rather than a timeout or no signal). */
export function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  if (e?.code === 1) return true; // GeolocationPositionError.PERMISSION_DENIED
  const msg = typeof e?.message === 'string' ? e.message : String(err);
  return /denied|not authorized|permission/i.test(msg);
}

export interface BlockedHelp {
  title: string;
  steps: string[];
}

/** Steps to allow location again, for the platform ('android' | 'ios' | 'web') and browser. */
export function blockedLocationHelp(platform: string, userAgent: string): BlockedHelp {
  if (platform === 'android') {
    return {
      title: 'Location is turned off for this app',
      steps: [
        'Open your phone’s Settings → Apps → Sunset Moon Events → Permissions → Location.',
        'Choose “Allow only while using the app”.',
        'Come back here and tap “Use my current location” again.',
      ],
    };
  }
  if (platform === 'ios') {
    return {
      title: 'Location is turned off for this app',
      steps: [
        'Open Settings → Privacy & Security → Location Services → Sunset Moon Events.',
        'Choose “While Using the App”.',
        'Come back here and tap “Use my current location” again.',
      ],
    };
  }

  const ua = userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua));
  if (iOS) {
    return {
      title: 'Location is blocked for this site',
      steps: [
        'Tap “aA” (or the page settings icon) in the address bar → Website Settings → Location → Allow.',
        'If Location isn’t listed there: Settings → Privacy & Security → Location Services → Safari Websites → “While Using the App”.',
        'Then tap “Use my current location” again.',
      ],
    };
  }
  if (/SamsungBrowser/.test(ua)) {
    return {
      title: 'Location is blocked for this site',
      steps: [
        'Tap the icon at the left of the address bar → Permissions (or Site settings) → Location → Allow.',
        'If that doesn’t work: Menu (☰) → Settings → Sites and downloads → Site permissions → Location, and remove this site from Blocked.',
        'Location will be picked up automatically once it’s allowed, or tap “Use my current location” again.',
      ],
    };
  }
  if (/Firefox|FxiOS/.test(ua)) {
    return {
      title: 'Location is blocked for this site',
      steps: [
        'Tap the icon at the left of the address bar and clear the blocked Location permission.',
        'Reload the page and tap “Use my current location” again, then choose Allow.',
      ],
    };
  }
  if (/Android/.test(ua)) {
    return {
      title: 'Location is blocked for this site',
      // Chrome 157 on Android: the page-info icon is gone from the address bar; it lives in the ⋮ menu.
      steps: [
        'Tap Chrome’s ⋮ menu (top right) → Site controls.',
        'Tap Permissions, then turn on the Location switch.',
        'Close that panel. Your location will be picked up automatically, or tap “Use my current location” again.',
      ],
    };
  }
  return {
    title: 'Location is blocked for this site',
    steps: [
      'Click the icon at the left of the address bar (next to the web address).',
      'Set Location to Allow (or reset the site’s permissions).',
      'Location will be picked up automatically once it’s allowed, or click “Use my current location” again.',
    ],
  };
}
