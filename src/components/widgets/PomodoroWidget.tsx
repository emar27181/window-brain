import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

const pad = (n: number) => String(n).padStart(2, '0');
const STORAGE_KEY = 'wb.pomodoro.v1';

const PRESETS = [
  { label: '25 min', minutes: 25 },
  { label: '50 min', minutes: 50 },
  { label: '5 min',  minutes: 5  },
];

function loadMinutes(): number {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? 25; }
  catch { return 25; }
}

export function PomodoroWidget() {
  const [totalMin, setTotalMin] = useState<number>(loadMinutes);
  const [remaining, setRemaining] = useState<number>(totalMin * 60);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const TOTAL = totalMin * 60;
  const pct = 1 - remaining / TOTAL;
  const C = 2 * Math.PI * 28;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const applyMinutes = (min: number) => {
    const clamped = Math.max(1, Math.min(180, min));
    setTotalMin(clamped);
    setRemaining(clamped * 60);
    setRunning(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped)); } catch {}
    setEditing(false);
  };

  const handleMainBtn = () => {
    if (remaining === 0) { setRemaining(TOTAL); setRunning(true); }
    else setRunning((r) => !r);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputVal(String(totalMin));
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 20);
  };

  return (
    <div className="w-body">
      <Head
        title="FOCUS"
        right={
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={startEditing}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 3px' }}
            title="時間を設定"
          >
            {totalMin}m ✎
          </button>
        }
      />

      {/* Time editor overlay */}
      {editing && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20, borderRadius: 18 }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>FOCUS TIME (分)</div>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {PRESETS.map((p) => (
              <button key={p.minutes} onClick={() => applyMinutes(p.minutes)}
                style={{ background: totalMin === p.minutes ? 'var(--accent,#9aa6ff)' : 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: totalMin === p.minutes ? '#0a0d14' : 'inherit' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="number"
              value={inputVal}
              min={1} max={180}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyMinutes(Number(inputVal));
                if (e.key === 'Escape') setEditing(false);
              }}
              style={{ width: 64, background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '8px 10px', color: '#fff', font: 'inherit', fontSize: 18, outline: 'none', textAlign: 'center' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,.5)' }}>分</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => applyMinutes(Number(inputVal))}
              style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditing(false)}
              style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r="32" stroke="currentColor" opacity="0.1" strokeWidth="2.5" fill="none" />
          <circle cx="45" cy="45" r="32" stroke="var(--accent,#9aa6ff)" strokeWidth="2.5" fill="none"
            strokeDasharray={2 * Math.PI * 32}
            strokeDashoffset={2 * Math.PI * 32 * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: running ? 'stroke-dashoffset .9s linear' : 'none' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
          <div className="mono" style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-.02em' }}>{pad(m)}:{pad(s)}</div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleMainBtn}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '.18em', opacity: .6 }}
          >
            {remaining === 0 ? 'RESET' : running ? 'PAUSE' : 'START'}
          </button>
        </div>
      </div>
    </div>
  );
}
