import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/react';
import { Geolocation } from '@capacitor/geolocation';
import { locate } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import type { Location } from '../astro';

interface Props {
  isOpen: boolean;
  current: Location | null;
  onSave: (loc: Location) => void;
  onClose: () => void;
}

export async function getDeviceLocation(): Promise<Location> {
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: 'Current location' };
}

export function LocationModal({ isOpen, current, onSave, onClose }: Props) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLat(current ? current.latitude.toFixed(4) : '');
      setLon(current ? current.longitude.toFixed(4) : '');
      setError('');
    }
  }, [isOpen, current]);

  const useGps = async () => {
    setBusy(true);
    setError('');
    try {
      onSave(await getDeviceLocation());
    } catch (e) {
      setError(`Couldn't get your location: ${(e as Error).message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

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
        <IonButton expand="block" onClick={useGps} disabled={busy}>
          {busy ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={locate} />Use my current location</>}
        </IonButton>

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
