import { useState, useEffect } from 'react';
import { Head } from '../Head';

export function SystemWidget() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const cpu = 32 + Math.sin(t * 0.7) * 8 + Math.sin(t * 0.31) * 6;
  const ram = 64 + Math.sin(t * 0.4 + 2) * 4;
  const gpu = 18 + Math.sin(t * 0.55 + 1) * 7;
  const rows = [
    { label: 'CPU', v: cpu },
    { label: 'MEM', v: ram },
    { label: 'GPU', v: gpu },
  ];

  return (
    <div className="w-body">
      <Head title="SYSTEM" right={<span className="mono muted" style={{ fontSize: 10 }}>M1 PRO</span>} />
      <div className="w-content" style={{ gap: 10, justifyContent: 'center' }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 3 }}>
              <span style={{ letterSpacing: '.14em' }}>{r.label}</span>
              <span>{r.v.toFixed(0)}%</span>
            </div>
            <div style={{ height: 2, background: 'var(--track)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ width: `${r.v}%`, height: '100%', background: 'var(--accent,#9aa6ff)', transition: 'width 1.4s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
