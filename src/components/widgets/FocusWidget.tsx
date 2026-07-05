import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.focus.v1';
const PRESETS = [15, 30, 45, 60, 90];

interface FocusData {
  date: string;
  totalMin: number;
}

function toDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): FocusData {
  try {
    const p: FocusData = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (p && p.date === toDateKey()) return p;
  } catch {}
  return { date: toDateKey(), totalMin: 0 };
}

function save(data: FocusData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const pad = (n: number) => String(n).padStart(2, '0');

export function FocusWidget({ size }: { size: Size }) {
  const [goalMin, setGoalMin] = useState(30);
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<FocusData>(load);
  const sessionStartRef = useRef<number | null>(null);
  const goalRef = useRef(goalMin);
  goalRef.current = goalMin;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          setData((prev) => {
            const next = { date: toDateKey(), totalMin: (prev.date === toDateKey() ? prev.totalMin : 0) + goalRef.current };
            save(next);
            return next;
          });
          sessionStartRef.current = null;
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    sessionStartRef.current = Date.now();
    return () => clearInterval(id);
  }, [running]);

  const handleStart = () => {
    if (remaining === 0) {
      setRemaining(goalMin * 60);
      setRunning(true);
    } else {
      if (running) {
        // pause: add elapsed to total
        if (sessionStartRef.current) {
          const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000);
          if (elapsed > 0) {
            setData((prev) => {
              const next = { date: toDateKey(), totalMin: (prev.date === toDateKey() ? prev.totalMin : 0) + elapsed };
              save(next);
              return next;
            });
          }
          sessionStartRef.current = null;
        }
      }
      setRunning((r) => !r);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setRemaining(goalMin * 60);
    sessionStartRef.current = null;
  };

  const selectPreset = (min: number) => {
    setGoalMin(min);
    setRemaining(min * 60);
    setRunning(false);
    sessionStartRef.current = null;
  };

  const TOTAL = goalMin * 60;
  const pct = 1 - remaining / TOTAL;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const r = 32;
  const C = 2 * Math.PI * r;
  const todayTotal = data.date === toDateKey() ? data.totalMin : 0;

  return (
    <div className="w-body">
      <Head title="FOCUS" right={
        todayTotal > 0 ? (
          <span className="mono" style={{ fontSize: 10, color: 'var(--accent,#9aa6ff)' }}>今日 {todayTotal} min</span>
        ) : null
      } />
      <div className="w-content" style={{ alignItems: 'center', justifyContent: 'center', gap: size.h >= 2 ? 12 : 8 }}>
        {/* Preset buttons */}
        <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {PRESETS.map((min) => (
            <button key={min} onClick={() => selectPreset(min)}
              style={{ background: goalMin === min ? 'var(--accent,#9aa6ff)' : 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: goalMin === min ? '#0a0d14' : 'var(--ink-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '.06em', transition: 'all .15s' }}>
              {min}m
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={size.h >= 2 ? 90 : 72} height={size.h >= 2 ? 90 : 72} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size.h >= 2 ? 45 : 36} cy={size.h >= 2 ? 45 : 36} r={r} stroke="currentColor" opacity="0.1" strokeWidth="2.5" fill="none" />
            <circle cx={size.h >= 2 ? 45 : 36} cy={size.h >= 2 ? 45 : 36} r={r} stroke="var(--accent,#9aa6ff)" strokeWidth="2.5" fill="none"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: running ? 'stroke-dashoffset .9s linear' : 'none' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <div className="mono" style={{ fontSize: size.h >= 2 ? 20 : 16, fontWeight: 400, letterSpacing: '-.02em' }}>{pad(m)}:{pad(s)}</div>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={handleStart}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '.18em', opacity: 0.6 }}>
              {remaining === 0 ? 'DONE' : running ? 'PAUSE' : 'START'}
            </button>
          </div>
        </div>

        <button onPointerDown={(e) => e.stopPropagation()} onClick={handleReset}
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', padding: '2px 6px' }}>
          RESET
        </button>
      </div>
    </div>
  );
}
