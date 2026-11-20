import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonSpinner, IonText,
  IonTitle, IonToolbar,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { locate } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import type { Location } from '../astro';
import { GPS_LABEL, placeNameFor, searchPlaces, type PlaceResult } from '../geocode';
import { blockedLocationHelp, isPermissionDenied, type BlockedHelp } from '../locationHelp';

/** The browser's own record of this site's location permission (web only; null if unsupported). */
async function webLocationPermission(): Promise<PermissionStatus | null> {
  if (Capacitor.isNativePlatform() || !navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name: 'geolocation' });
  } catch {
    return null;
  }
}

interface Props {
  isOpen: boolean;
  current: Location | null;
  onSave: (loc: Location) => void;
  onClose: () => void;
}

export async function getDeviceLocation(): Promise<Location> {
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
  const { latitude, longitude } = pos.coords;
  return { latitude, longitude, label: (await placeNameFor(latitude, longitude)) ?? GPS_LABEL };
}

export function LocationModal({ isOpen, current, onSave, onClose }: Props) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState<BlockedHelp | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLat(current ? current.latitude.toFixed(4) : '');
      setLon(current ? current.longitude.toFixed(4) : '');
      setError('');
      setBlocked(null);
      setQuery('');
      setResults([]);
      setSearchMsg('');
    }
  }, [isOpen, current]);

  // Search as the user types (the searchbar debounces), cancelling any request still in flight.
  useEffect(() => {
    searchAbort.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      setSearchMsg('');
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    setSearching(true);
    searchPlaces(query, ctrl.signal)
      .then((r) => {
        setResults(r);
        setSearchMsg(r.length ? '' : 'No places found. Try a city name or ZIP / postal code.');
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setResults([]);
        setSearchMsg(`Search isn't working right now (${(e as Error).message}). Check your connection.`);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSearching(false);
      });
    return () => ctrl.abort();
  }, [query]);

  const showBlocked = () =>
    setBlocked(blockedLocationHelp(Capacitor.getPlatform(), navigator.userAgent));

  const useGps = async () => {
    setBusy(true);
    setError('');
    try {
      // If the browser has already blocked this site, asking again fails silently; show how to unblock instead.
      if ((await webLocationPermission())?.state === 'denied') {
        showBlocked();
        return;
      }
      setBlocked(null);
      onSave(await getDeviceLocation());
    } catch (e) {
      if (isPermissionDenied(e)) showBlocked();
      else setError(`Couldn't get your location: ${(e as Error).message ?? e}. Try again, or search for your city.`);
    } finally {
      setBusy(false);
    }
  };
  const useGpsRef = useRef(useGps);
  useGpsRef.current = useGps;

  // While the unblock steps are showing, watch the browser's permission: as soon as the user
  // switches location to Allow in site settings, fetch it without another tap.
  useEffect(() => {
    if (!blocked || !isOpen) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const onChange = () => {
      if (status?.state === 'granted') void useGpsRef.current();
      else if (status?.state === 'prompt') setBlocked(null); // reset: the next tap shows the browser's prompt
    };
    void webLocationPermission().then((s) => {
      if (cancelled || !s) return;
      status = s;
      s.addEventListener('change', onChange);
    });
    return () => {
      cancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, [blocked, isOpen]);

  const saveManual = () => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180)) {
      setError('Latitude must be −90…90 and longitude −180…180.');
      return;
    }
    onSave({ latitude: la, longitude: lo, label: `${la.toFixed(2)}, ${lo.toFixed(2)}` });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Location</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSearchbar
          className="place-search"
          placeholder="Search city or ZIP code"
          value={query}
          debounce={350}
          inputmode="search"
          enterkeyhint="search"
          onIonInput={(e) => setQuery(String(e.detail.value ?? ''))}
          onIonClear={() => setQuery('')}
        />
        {searching && <div className="search-status"><IonSpinner name="dots" /></div>}
        {!searching && searchMsg && <p className="hint">{searchMsg}</p>}
        {results.length > 0 && (
          <IonList inset>
            {results.map((r) => (
              <IonItem key={`${r.latitude},${r.longitude}`} button detail={false}
                onClick={() => onSave({ latitude: r.latitude, longitude: r.longitude, label: r.label })}>
                <IonLabel>
                  <h2>{r.label}</h2>
                  {r.detail && <p>{r.detail}</p>}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonButton expand="block" onClick={useGps} disabled={busy}>
          {busy ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={locate} />Use my current location</>}
        </IonButton>
        {blocked && (
          <div className="location-blocked" role="status">
            <strong>{blocked.title}</strong>
            <ol>
              {blocked.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p>Or search for your city or ZIP code above.</p>
          </div>
        )}

        <p className="hint">Or enter coordinates (decimal degrees, west/south negative):</p>
        <IonList inset>
          <IonItem>
            <IonInput label="Latitude" labelPlacement="stacked" inputmode="decimal" value={lat} placeholder="40.7128"
              onIonInput={(e) => setLat(String(e.detail.value ?? ''))} />
          </IonItem>
          <IonItem>
            <IonInput label="Longitude" labelPlacement="stacked" inputmode="decimal" value={lon} placeholder="-74.0060"
              onIonInput={(e) => setLon(String(e.detail.value ?? ''))} />
          </IonItem>
        </IonList>
        <IonButton expand="block" fill="outline" onClick={saveManual}>Save coordinates</IonButton>

        {error && <IonText color="danger"><p>{error}</p></IonText>}
        <p className="hint">Times are shown in this device's time zone.</p>
      </IonContent>
    </IonModal>
  );
}
