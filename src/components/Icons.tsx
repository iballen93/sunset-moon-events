interface IconProps {
  size?: number;
  title?: string;
}

const SUN = '#ff9a3c';
const HORIZON = '#e0603a';
const MOON = '#f4e9b8';
const MOON_EDGE = '#b9a76a';
const CRATER = '#ddcf95';

/** Half sun sitting on the horizon, centered at x = cx with radius r. */
function SettingSun({ cx, r }: { cx: number; r: number }) {
  const ray = r + 1.6;
  const diag = Math.SQRT1_2;
  return (
    <g>
      <path d={`M${cx - r} 22 A${r} ${r} 0 0 1 ${cx + r} 22 Z`} fill={SUN} />
      <g stroke={SUN} strokeWidth="1.6" strokeLinecap="round">
        <line x1={cx} y1={22 - ray} x2={cx} y2={22 - ray - 2} />
        <line x1={cx - ray * diag} y1={22 - ray * diag} x2={cx - (ray + 2) * diag} y2={22 - (ray + 2) * diag} />
        <line x1={cx + ray * diag} y1={22 - ray * diag} x2={cx + (ray + 2) * diag} y2={22 - (ray + 2) * diag} />
      </g>
    </g>
  );
}

function Horizon() {
  return <line x1="1.5" y1="22.5" x2="30.5" y2="22.5" stroke={HORIZON} strokeWidth="1.6" strokeLinecap="round" />;
}

/** Sun setting in the west (left) while the full moon rises opposite it in the east (right). */
export function SunsetFullMoonIcon({ size = 24, title = 'Sunset + full moonrise' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title}>
      <title>{title}</title>
      <SettingSun cx={8} r={6.5} />
      <circle cx="25" cy="16" r="5.8" fill={MOON} stroke={MOON_EDGE} strokeWidth="0.8" />
      <circle cx="23.2" cy="14.6" r="1.2" fill={CRATER} />
      <circle cx="26.8" cy="17.6" r="1.4" fill={CRATER} />
      <Horizon />
    </svg>
  );
}

/** Young crescent setting just after the sun, on the same (western) side of the sky. */
export function SunsetCrescentIcon({ size = 24, title = 'Sunset + young crescent moonset' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title}>
      <title>{title}</title>
      <SettingSun cx={12} r={8} />
      <Horizon />
      {/* Thin waxing crescent, lit side facing the set sun (lower left). */}
      <path
        d="M27.5 3.5 A6 6 0 1 0 27.5 14.5 A5 5 0 1 1 27.5 3.5 Z"
        fill={MOON}
        stroke={MOON_EDGE}
        strokeWidth="0.6"
        transform="rotate(-25 24 9)"
      />
    </svg>
  );
}
