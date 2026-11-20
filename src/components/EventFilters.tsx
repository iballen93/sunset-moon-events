import { IonButton, IonRange } from '@ionic/react';
import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_WINDOWS, MAX_WINDOWS, type EventWindows, type TimeWindow } from '../astro';
import { describeWindow, sameWindows } from '../eventSettings';
import { fmtOffsetShort } from '../format';
import { SunsetCrescentIcon, SunsetFullMoonIcon } from './Icons';

interface Props {
  windows: EventWindows;
  onChange: (w: EventWindows) => void;
}

type Kind = keyof EventWindows;

const STEP_MIN = 5;

/** Slider value as shown on the handles and ends: "−1:30", "+45m", or "sunset" at 0. */
const fmtPin = (v: number) => (v === 0 ? 'sunset' : fmtOffsetShort(v));

/**
 * The two event types under the calendar, each with a two-handle slider for how close to sunset
 * the moonrise / moonset must be. The description follows the handles while dragging; the
 * calendar updates when a handle is let go.
 */
export function EventFilters({ windows, onChange }: Props) {
  const [draft, setDraft] = useState(windows);
  useEffect(() => setDraft(windows), [windows]);

  const toWindow = (v: unknown): TimeWindow | null => {
    const r = v as { lower?: number; upper?: number } | null;
    return r && typeof r.lower === 'number' && typeof r.upper === 'number' ? { start: r.lower, end: r.upper } : null;
  };

  const row = (kind: Kind, icon: ReactNode, what: string) => {
    const w = draft[kind];
    const max = MAX_WINDOWS[kind];
    return (
      <div className="event-filter">
        <div className="event-filter-label">
          {icon}
          <span>{what} {describeWindow(w)}</span>
        </div>
        <IonRange
          aria-label={`${what} window`}
          dualKnobs
          min={max.start}
          max={max.end}
          step={STEP_MIN}
          pin
          pinFormatter={fmtPin}
          value={{ lower: w.start, upper: w.end }}
          onIonInput={(e) => {
            const next = toWindow(e.detail.value);
            if (next) setDraft((d) => ({ ...d, [kind]: next }));
          }}
          onIonChange={(e) => {
            const next = toWindow(e.detail.value);
            if (next && (next.start !== windows[kind].start || next.end !== windows[kind].end)) {
              onChange({ ...windows, [kind]: next });
            }
          }}
        >
          <span slot="start" className="event-filter-end">{fmtPin(max.start)}</span>
          <span slot="end" className="event-filter-end">{fmtPin(max.end)}</span>
        </IonRange>
      </div>
    );
  };

  return (
    <div className="event-filters">
      {row('full', <SunsetFullMoonIcon size={22} />, 'Moonrise')}
      {row('crescent', <SunsetCrescentIcon size={22} />, 'Moonset')}
      <div className="event-filter-buttons">
        <IonButton size="small" fill="outline" disabled={sameWindows(windows, DEFAULT_WINDOWS)}
          onClick={() => onChange(DEFAULT_WINDOWS)}>
          Reset to default
        </IonButton>
        <IonButton size="small" fill="outline" disabled={sameWindows(windows, MAX_WINDOWS)}
          onClick={() => onChange(MAX_WINDOWS)}>
          Show all events
        </IonButton>
      </div>
    </div>
  );
}
