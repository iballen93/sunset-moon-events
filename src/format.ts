export function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function fmtOffset(min: number): string {
  const sign = min < 0 ? '−' : '+';
  const abs = Math.round(Math.abs(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h ? `${h}h ` : ''}${m}m`;
}

/** Compact offset for calendar tiles: "−16m", "+1:15". */
export function fmtOffsetShort(min: number): string {
  const sign = min < 0 ? '−' : '+';
  const abs = Math.round(Math.abs(min));
  if (abs < 60) return `${sign}${abs}m`;
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** Compact whole-number percent for calendar tiles. */
export function fmtPctShort(f: number): string {
  return `${Math.round(f * 100)}%`;
}

export function fmtPct(f: number): string {
  return `${(f * 100).toFixed(f < 0.1 ? 1 : 0)}%`;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
