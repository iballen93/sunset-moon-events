import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonNote, IonTitle, IonToolbar,
} from '@ionic/react';
import type { DayInfo } from '../astro';
import { fmtDate, fmtOffset, fmtPct, fmtTime } from '../format';
import { SunsetCrescentIcon, SunsetFullMoonIcon } from './Icons';

interface Props {
  day: DayInfo | null;
  onClose: () => void;
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <IonItem>
      <IonLabel>{label}</IonLabel>
      <IonNote slot="end" className="detail-value">
        {value}
        {note && <span className="detail-sub">{note}</span>}
      </IonNote>
    </IonItem>
  );
}

export function DayDetail({ day, onClose }: Props) {
  return (
    <IonModal isOpen={!!day} onDidDismiss={onClose} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{day ? day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {day && (
          <>
            <p className="detail-date">{fmtDate(day.date)}</p>

            {day.fullMoonEvent && (
              <div className="event-banner full">
                <SunsetFullMoonIcon size={44} />
                <div>
                  <strong>Sunset + Full Moonrise</strong>
                  <div>Moon rises {fmtOffset(day.fullMoonEvent.offsetMin)} from sunset</div>
                </div>
              </div>
            )}
            {day.newMoonEvent && (
              <div className="event-banner new">
                <SunsetCrescentIcon size={44} />
                <div>
                  <strong>Sunset + Crescent Moonset</strong>
                  <div>Moon sets {fmtOffset(day.newMoonEvent.offsetMin)} after sunset</div>
                </div>
              </div>
            )}

            <IonList inset>
              <IonListHeader>Sun</IonListHeader>
              <Row label="Sunrise" value={fmtTime(day.sunrise)} />
              <Row label="Sunset" value={fmtTime(day.sunset)} />
            </IonList>

            <IonList inset>
              <IonListHeader>Moon</IonListHeader>
              {day.fullMoonEvent ? (
                <Row label="Moonrise (evening)" value={fmtTime(day.fullMoonEvent.moonrise)} note={fmtOffset(day.fullMoonEvent.offsetMin)} />
              ) : (
                <Row label="Moonrise" value={fmtTime(day.moonrise)} />
              )}
              {day.newMoonEvent ? (
                <Row label="Moonset (evening)" value={fmtTime(day.newMoonEvent.moonset)} note={fmtOffset(day.newMoonEvent.offsetMin)} />
              ) : (
                <Row label="Moonset" value={fmtTime(day.moonset)} />
              )}
              <Row label="Illumination at sunset" value={fmtPct(day.illumination)} />
              {day.newMoonEvent && <Row label="Illumination at moonset" value={fmtPct(day.newMoonEvent.illumination)} />}
              <Row label="Phase" value={day.phaseName} />
            </IonList>

            {!day.sunset && <p className="hint">The sun does not set on this day at this location.</p>}
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
