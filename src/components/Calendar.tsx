import type { DayInfo } from '../astro';
import { fmtOffsetShort, fmtPctShort } from '../format';
import { SunsetCrescentIcon, SunsetFullMoonIcon } from './Icons';

interface Props {
  year: number;
  month: number;
  days: DayInfo[];
  onSelect: (day: DayInfo) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ year, month, days, onSelect }: Props) {
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
