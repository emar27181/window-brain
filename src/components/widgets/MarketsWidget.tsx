import { Head } from '../Head';
import type { Size } from '../../types';

function Sparkline({ points, w, h, color }: { points: number[]; w: number; h: number; color: string }) {
  const min = Math.min(...points), max = Math.max(...points);
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const ROWS = [
  { sym: 'BTC',  name: 'Bitcoin',  v: 67234,  d: +2.41, sp: [60,61,59,62,64,63,66,67,65,68,67,69] },
  { sym: 'ETH',  name: 'Ethereum', v: 3540,   d: -0.84, sp: [3600,3580,3550,3500,3520,3540,3530,3500,3520,3540,3530,3540] },
  { sym: 'NVDA', name: 'NVIDIA',   v: 945.20, d: +1.12, sp: [920,925,930,935,940,945,940,948,944,946,945,945] },
  { sym: 'SOL',  name: 'Solana',   v: 148.3,  d: +3.87, sp: [130,135,140,138,142,145,144,148,146,150,148,148] },
];

export function MarketsWidget({ size }: { size: Size }) {
  const rows = ROWS.slice(0, size.h >= 2 ? 4 : 2);
  const wide = size.w >= 3;
  const cols = wide ? '36px minmax(0,1fr) auto auto' : '32px minmax(0,1fr) auto';

  return (
    <div className="w-body">
      <Head title="MARKETS" right={<span className="mono muted" style={{ fontSize: 10 }}>USD</span>} />
      <div className="w-content" style={{ gap: size.h >= 2 ? 4 : 6, justifyContent: 'space-around', minWidth: 0 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: wide ? 10 : 8, fontSize: 12, minWidth: 0 }}>
            <div className="mono" style={{ fontWeight: 500, letterSpacing: '.04em' }}>{r.sym}</div>
            {wide
              ? <div style={{ opacity: .6, height: 18, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}><Sparkline points={r.sp} w={80} h={18} color="currentColor" /></div>
              : <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.v.toLocaleString()}</div>
            }
            {wide && <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.v.toLocaleString()}</div>}
            <div className="mono" style={{ textAlign: 'right', color: r.d > 0 ? '#5dd6a0' : '#ff7a8a', fontSize: 11, whiteSpace: 'nowrap' }}>
              {r.d > 0 ? '+' : ''}{r.d.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
