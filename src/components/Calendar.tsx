import type { DayInfo } from '../astro';
import { fmtOffsetShort, fmtPctShort } from '../format';
import { SunsetCrescentIcon, SunsetFullMoonIcon } from './Icons';

interface Props {
  year: number;
  month: number;
  days: DayInfo[];
  onSelect: (day: DayInfo) => void;
  /** Every day shows its moonrise and moonset nearest sunset (DayInfo.nearSunset) instead of events. */
  showAll?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ year, month, days, onSelect, showAll = false }: Props) {
  const leading = new Date(year, month, 1).getDay();
  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  return (
    <div className="calendar">
      {WEEKDAYS.map((w) => (
        <div key={w} className="weekday">{w}</div>
      ))}
      {Array.from({ length: leading }, (_, i) => (
        <div key={`pad-${i}`} className="day empty" />
      ))}
      {days.map((d) => {
        if (showAll) {
          const near = d.nearSunset;
          const offset = (m: number | null | undefined) => (m == null ? '—' : fmtOffsetShort(m));
          return (
            <button key={d.date.getDate()} className={['day', 'all', isToday(d.date) && 'today'].filter(Boolean).join(' ')}
              onClick={() => onSelect(d)}>
              <span className="num">{d.date.getDate()}</span>
              <span className="tile-all">
                <span className="tile-all-row" title="Moonrise vs sunset"><SunsetFullMoonIcon size={14} />{offset(near?.moonriseMin)}</span>
                <span className="tile-all-row" title="Moonset vs sunset"><SunsetCrescentIcon size={14} />{offset(near?.moonsetMin)}</span>
                <span className="tile-all-pct">{fmtPctShort(d.illumination)}</span>
              </span>
            </button>
          );
        }
        const event = d.fullMoonEvent || d.newMoonEvent;
        const cls = ['day', event && 'event', d.fullMoonEvent && 'full', d.newMoonEvent && 'new', isToday(d.date) && 'today']
          .filter(Boolean)
          .join(' ');
        return (
          <button key={d.date.getDate()} className={cls} onClick={() => onSelect(d)}>
            <span className="num">{d.date.getDate()}</span>
            {d.fullMoonEvent && (
              <span className="tile-event">
                <SunsetFullMoonIcon size={26} />
                <span className="tile-meta">
                  <span>{fmtOffsetShort(d.fullMoonEvent.offsetMin)}</span>
                  <span>{fmtPctShort(d.illumination)}</span>
                </span>
              </span>
            )}
            {d.newMoonEvent && (
              <span className="tile-event">
                <SunsetCrescentIcon size={26} />
                <span className="tile-meta">
                  <span>{fmtOffsetShort(d.newMoonEvent.offsetMin)}</span>
                  <span>{fmtPctShort(d.newMoonEvent.illumination)}</span>
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
