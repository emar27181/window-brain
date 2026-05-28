import { Head } from '../Head';
import type { Size } from '../../types';

export function WeatherWidget({ size }: { size: Size }) {
  const big = size.w >= 2 && size.h >= 2;
  return (
    <div className="w-body">
      <Head title="WEATHER" right={<span className="mono muted" style={{ fontSize: 10 }}>TOKYO</span>} />
      <div className="w-content" style={{ justifyContent: 'space-between', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: big ? 6 : 0, minWidth: 0, flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: big ? 56 : 38, fontWeight: 300, letterSpacing: '-.04em', lineHeight: 1 }}>18°</div>
          <div style={{ fontSize: 13, fontWeight: 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Mostly clear</div>
        </div>
        {big && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', minWidth: 0 }}>
            {[['NOW','18°'],['16','17°'],['18','17°'],['20','15°'],['22','13°']].map(([t, v], i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
                <div className="muted" style={{ letterSpacing: '.08em' }}>{t}</div>
                <div style={{ marginTop: 4, opacity: i === 0 ? 1 : .7 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.12em', display: 'flex', gap: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span>H 21°</span><span>L 12°</span>{size.w >= 3 && <span>UV 3</span>}
        </div>
      </div>
    </div>
  );
}
