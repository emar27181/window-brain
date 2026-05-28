import { useNow } from '../../hooks/useNow';
import type { Size } from '../../types';

const pad = (n: number) => String(n).padStart(2, '0');

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function ClockWidget({ size }: { size: Size }) {
  const now = useNow(1000);
  const dateStr = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`;
  const big  = size.w >= 4 && size.h >= 3;
  const huge = size.w >= 4 && size.h >= 4;
  const secAngle = (now.getSeconds() + now.getMilliseconds() / 1000) * 6;

  return (
    <div className="w-body clock-w" style={{ containerType: 'size', padding: big ? '20px 24px' : '16px 18px' }}>
      <div className="w-head" style={{ marginBottom: big ? 0 : 10 }}>
        <div className="title"><span className="glyph"></span>LOCAL TIME</div>
        <span className="mono muted" style={{ fontSize: 10 }}>JST · TOKYO</span>
      </div>

      <div className="w-content" style={{ justifyContent: 'center', alignItems: big ? 'center' : 'flex-start', position: 'relative' }}>
        {huge && (
          <div style={{ position: 'absolute', inset: '8% 8% 18% 8%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: 'min(86cqi, 78cqb)', aspectRatio: '1', borderRadius: '50%', border: '.5px solid var(--rule)' }}>
              <div style={{ position: 'absolute', inset: 0, transform: `rotate(${secAngle}deg)`, transition: now.getSeconds() === 0 ? 'none' : 'transform 1s linear' }}>
                <div style={{ position: 'absolute', top: -3, left: '50%', marginLeft: -3, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent, #9aa6ff)', boxShadow: '0 0 12px var(--accent, #9aa6ff)' }} />
              </div>
            </div>
          </div>
        )}

        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400,
          lineHeight: 0.9, letterSpacing: '-.045em', fontFeatureSettings: '"tnum"',
          fontSize: big ? 'clamp(72px, 36cqi, 240px)' : 'clamp(38px, 48cqb, 92px)',
          textAlign: big ? 'center' : 'left', position: 'relative', zIndex: 1,
          textShadow: huge ? '0 2px 30px rgba(0,0,0,.4)' : 'none',
        }}>
          {pad(now.getHours())}<span style={{ opacity: .5, padding: '0 .02em' }}>:</span>{pad(now.getMinutes())}
        </div>

        {big && (
          <div className="mono" style={{ marginTop: huge ? 'clamp(14px, 4cqb, 28px)' : 12, fontSize: 'clamp(10px, 1.7cqi, 13px)', letterSpacing: '.32em', color: 'var(--ink-mute)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            {dateStr}
          </div>
        )}
        {!big && (
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.18em', marginTop: 10 }}>
            {dateStr}
          </div>
        )}
      </div>
    </div>
  );
}
