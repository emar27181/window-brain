import { useState, useEffect } from 'react';
import { Head } from '../Head';

const pad = (n: number) => String(n).padStart(2, '0');
const TOTAL = 25 * 60;

export function PomodoroWidget() {
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const m = Math.floor(remaining / 60), s = remaining % 60;
  const pct = 1 - remaining / TOTAL;
  const C = 2 * Math.PI * 28;

  return (
    <div className="w-body">
      <Head title="FOCUS" />
      <div className="w-content" style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="28" stroke="currentColor" opacity="0.12" strokeWidth="2" fill="none" />
          <circle cx="40" cy="40" r="28" stroke="var(--accent,#9aa6ff)" strokeWidth="2" fill="none"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .9s linear' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div className="mono" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-.02em' }}>{pad(m)}:{pad(s)}</div>
          <button
            onClick={() => {
              if (remaining === 0) { setRemaining(TOTAL); setRunning(true); }
              else setRunning(!running);
            }}
            style={{ marginTop: 4, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '.18em', opacity: .6 }}
          >
            {remaining === 0 ? 'RESET' : running ? 'PAUSE' : 'START'}
          </button>
        </div>
      </div>
    </div>
  );
}
