import { Head } from '../Head';
import type { Size } from '../../types';

export function TokensWidget({ size }: { size: Size }) {
  const used = 142800, cap = 200000;
  const pct = used / cap;
  const big = size.h >= 2;
  return (
    <div className="w-body">
      <Head title="AI USAGE" right={<span className="mono muted" style={{ fontSize: 10 }}>MAY</span>} />
      <div className="w-content" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="mono" style={{ fontSize: big ? 32 : 24, fontWeight: 300, letterSpacing: '-.03em', lineHeight: 1 }}>
            {(used / 1000).toFixed(1)}<span className="muted" style={{ fontSize: '.55em' }}>k</span>
          </div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.16em', marginTop: 6 }}>OF {(cap / 1000) | 0}K TOKENS</div>
        </div>
        <div>
          <div style={{ height: 3, background: 'var(--track)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--accent,#9aa6ff)', transition: 'width .8s' }} />
          </div>
          {big && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              <span className="muted">IN 89k</span><span className="muted">OUT 54k</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
