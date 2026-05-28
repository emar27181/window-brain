import { useMemo } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

function generateCells(): number[] {
  const out: number[] = [];
  let r = 42;
  for (let i = 0; i < 12 * 7; i++) {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    const v = r % 100;
    out.push(v < 30 ? 0 : v < 55 ? 1 : v < 78 ? 2 : v < 92 ? 3 : 4);
  }
  return out;
}

const LEVELS = [
  'var(--track-soft)',
  'rgba(154,166,255,.25)',
  'rgba(154,166,255,.45)',
  'rgba(154,166,255,.7)',
  'var(--accent,#9aa6ff)',
];

export function GithubWidget({ size }: { size: Size }) {
  const cells = useMemo(generateCells, []);

  return (
    <div className="w-body">
      <Head title="COMMITS" right={<span className="mono muted" style={{ fontSize: 10 }}>347 · 12W</span>} />
      <div className="w-content" style={{ justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gridTemplateRows: 'repeat(7,1fr)', gap: 3, flex: 1, gridAutoFlow: 'column', maxHeight: size.h >= 2 ? '100%' : 54 }}>
          {cells.map((v, i) => (
            <div key={i} style={{ background: LEVELS[v], borderRadius: 2, aspectRatio: '1' }} />
          ))}
        </div>
        {size.h >= 2 && (
          <div className="mono muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '.14em', marginTop: 10 }}>
            <span>STREAK 18d</span><span>TODAY 7</span>
          </div>
        )}
      </div>
    </div>
  );
}
