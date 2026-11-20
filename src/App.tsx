import {
  IonApp, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { chevronBack, chevronForward, locationOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { analyzeMonth, type DayInfo, type Location } from './astro';
import { syncCarEvents } from './carExport';
import { Calendar } from './components/Calendar';
import { DayDetail } from './components/DayDetail';
import { SunsetCrescentIcon, SunsetFullMoonIcon } from './components/Icons';
import { LocationModal } from './components/LocationModal';
import { fmtOffset, fmtPct, fmtTime } from './format';

const STORAGE_KEY = 'sunsetmoonevents.location';

// Ionic locks the page body, which turns off the browser's own pull-down-to-refresh,
// so the website gets Ionic's version instead. It reloads the page just as the browser would.
const PULL_TO_REFRESH = !Capacitor.isNativePlatform();

function loadLocation(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Location) : null;
  } catch {
    return null;
  }
}

function saveLocation(loc: Location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    /* storage unavailable; location just won't persist */
  }
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [location, setLocation] = useState<Location | null>(loadLocation);
  const [locOpen, setLocOpen] = useState(false);
  const [selected, setSelected] = useState<DayInfo | null>(null);

  // First launch: open the location page. Location permission is only requested
  // when the user taps "Use my current location" there.
  useEffect(() => {
    if (!location) setLocOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLocation(loc: Location) {
    setLocation(loc);
    saveLocation(loc);
    setLocOpen(false);
  }

  // Keep the Android Auto screen's data current (runs after first paint; no-op off Android).
  useEffect(() => {
    if (!location) return;
    const t = setTimeout(() => void syncCarEvents(location), 800);
    return () => clearTimeout(t);
  }, [location]);

  const days = useMemo(() => (location ? analyzeMonth(year, month, location) : []), [year, month, location]);
  const events = days.filter((d) => d.fullMoonEvent || d.newMoonEvent);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Sunset Moon Events</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setLocOpen(true)} aria-label="Change location">
                <IonIcon slot="icon-only" icon={locationOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {PULL_TO_REFRESH && (
            <IonRefresher slot="fixed" onIonRefresh={() => window.location.reload()}>
              <IonRefresherContent />
            </IonRefresher>
          )}
          <div className="wrap">
            <div className="month-nav">
              <IonButton fill="clear" onClick={() => shift(-1)} aria-label="Previous month">
                <IonIcon slot="icon-only" icon={chevronBack} />
              </IonButton>
              <button className="month-label" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>
                {monthLabel}
              </button>
              <IonButton fill="clear" onClick={() => shift(1)} aria-label="Next month">
                <IonIcon slot="icon-only" icon={chevronForward} />
              </IonButton>
            </div>

            {location ? (
              <>
                <p className="loc-label">{location.label ?? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}</p>
                <Calendar year={year} month={month} days={days} onSelect={setSelected} />

                <div className="legend">
                  <span><SunsetFullMoonIcon size={22} /> Moonrise within ±1h of sunset</span>
                  <span><SunsetCrescentIcon size={22} /> Moonset 30m–2.5h after sunset</span>
                </div>

                <IonList inset>
                  <IonListHeader>Best days this month</IonListHeader>
                  {events.length === 0 && (
                    <IonItem><IonLabel color="medium">No qualifying days this month.</IonLabel></IonItem>
                  )}
                  {events.flatMap((d) => {
                    const rows = [];
                    const dateStr = d.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                    if (d.fullMoonEvent) {
                      rows.push(
                        <IonItem key={`f${d.date.getDate()}`} button detail onClick={() => setSelected(d)}>
                          <span slot="start"><SunsetFullMoonIcon size={30} /></span>
                          <IonLabel>
                            <h3>{dateStr}</h3>
                            <p>Sunset {fmtTime(d.sunset)} · Moonrise {fmtTime(d.fullMoonEvent.moonrise)}</p>
                          </IonLabel>
                          <IonNote slot="end" className="list-note">
                            <span>{fmtOffset(d.fullMoonEvent.offsetMin)}</span>
                            <span>{fmtPct(d.illumination)} lit</span>
                          </IonNote>
                        </IonItem>,
                      );
                    }
                    if (d.newMoonEvent) {
                      rows.push(
                        <IonItem key={`n${d.date.getDate()}`} button detail onClick={() => setSelected(d)}>
                          <span slot="start"><SunsetCrescentIcon size={30} /></span>
                          <IonLabel>
                            <h3>{dateStr}</h3>
                            <p>Sunset {fmtTime(d.sunset)} · Moonset {fmtTime(d.newMoonEvent.moonset)}</p>
                          </IonLabel>
                          <IonNote slot="end" className="list-note">
                            <span>{fmtOffset(d.newMoonEvent.offsetMin)}</span>
                            <span>{fmtPct(d.newMoonEvent.illumination)} lit</span>
                          </IonNote>
                        </IonItem>,
                      );
                    }
                    return rows;
                  })}
                </IonList>
              </>
            ) : (
              <div className="empty-state">
                <p>Set a location to calculate sun and moon times.</p>
                <IonButton onClick={() => setLocOpen(true)}>Set location</IonButton>
              </div>
            )}
          </div>
        </IonContent>

        <DayDetail day={selected} onClose={() => setSelected(null)} />
        <LocationModal isOpen={locOpen} current={location} onSave={updateLocation} onClose={() => setLocOpen(false)} />
      </IonPage>
    </IonApp>
  );
}
