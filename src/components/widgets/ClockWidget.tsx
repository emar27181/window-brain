import { useNow } from '../../hooks/useNow';
import type { Size } from '../../types';

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

const CX = 100, CY = 100, R = 86;

// Compute start/end point of a hand from center, given degrees (0=12 o'clock)
function handPts(deg: number, r0: number, r1: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x1: CX + c * R * r0, y1: CY + s * R * r0, x2: CX + c * R * r1, y2: CY + s * R * r1 };
}

function AnalogFace({ h, m, s }: { h: number; m: number; s: number }) {
  const secDeg  = s * 6;
  const minDeg  = m * 6 + s * 0.1;
  const hourDeg = (h % 12) * 30 + m * 0.5;

  const hour = handPts(hourDeg, -0.10,  0.52);
  const min  = handPts(minDeg,  -0.12,  0.73);
  const sec  = handPts(secDeg,  -0.22,  0.84);

  return (
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--rule)" strokeWidth={0.75} />

      {/* Ticks */}
      {Array.from({ length: 60 }, (_, i) => {
        const isHour = i % 5 === 0;
        const rad = (i * 6 - 90) * (Math.PI / 180);
        const innerR = isHour ? R - 9 : R - 4.5;
        return (
          <line key={i}
            x1={CX + Math.cos(rad) * innerR} y1={CY + Math.sin(rad) * innerR}
            x2={CX + Math.cos(rad) * R}      y2={CY + Math.sin(rad) * R}
            stroke={isHour ? 'var(--ink-mute)' : 'var(--rule-strong)'}
            strokeWidth={isHour ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        );
      })}

      {/* Hour hand */}
      <line {...hour} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" opacity={0.7} />

      {/* Minute hand */}
      <line {...min} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />

      {/* Second hand tail + tip dot at tail end */}
      <line
        x1={sec.x1} y1={sec.y1} x2={CX} y2={CY}
        stroke="var(--accent)" strokeWidth={0.9} strokeLinecap="round" opacity={0.4}
      />
      <circle cx={sec.x1} cy={sec.y1} r={2.5} fill="var(--accent)" />
      {/* Second hand */}
      <line
        x1={CX} y1={CY} x2={sec.x2} y2={sec.y2}
        stroke="var(--accent)" strokeWidth={0.9} strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={2.8} fill="var(--accent)" />
    </svg>
  );
}

export function ClockWidget({ size }: { size: Size }) {
  const now  = useNow(1000);
  const h    = now.getHours();
  const m    = now.getMinutes();
  const s    = now.getSeconds();
  const big  = size.w >= 4 && size.h >= 3;
  const huge = size.w >= 4 && size.h >= 4;

  const dateStr = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`;

  return (
    <div className="w-body clock-w" style={{ containerType: 'size', padding: big ? '20px 24px' : '16px 18px' }}>
      <div className="w-head" style={{ marginBottom: big ? 8 : 10, position: 'relative', zIndex: 2 }}>
        <div className="title"><span className="glyph"></span>LOCAL TIME</div>
        <span className="mono muted" style={{ fontSize: 10 }}>JST · TOKYO</span>
      </div>

      <div className="w-content" style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <AnalogFace h={h} m={m} s={s} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400,
            lineHeight: 0.9, letterSpacing: '-.045em', fontFeatureSettings: '"tnum"',
            fontSize: huge
              ? 'clamp(60px, 26cqi, 170px)'
              : big
                ? 'clamp(44px, 22cqi, 130px)'
                : 'clamp(28px, 38cqb, 72px)',
            textShadow: big ? '0 2px 24px rgba(0,0,0,.5)' : 'none',
          }}>
            {pad(h)}<span style={{ opacity: 0.35, padding: '0 .02em' }}>:</span>{pad(m)}
          </div>

          <div className="mono" style={{
            marginTop: big ? 'clamp(10px, 3cqb, 20px)' : 8,
            fontSize: big ? 'clamp(9px, 1.4cqi, 12px)' : 10,
            letterSpacing: big ? '.30em' : '.16em',
            color: 'var(--ink-faint)',
          }}>
            {dateStr}
          </div>
        </div>
      </div>
    </div>
  );
}
