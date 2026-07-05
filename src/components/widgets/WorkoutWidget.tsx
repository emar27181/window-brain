import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.workout.v1';
const TYPES = ['Run', 'Gym', 'Bike', 'Swim', 'Walk', 'Yoga', 'Other'];

interface WorkoutEntry {
  id: number;
  type: string;
  minutes: number;
  note: string;
  date: string;
}

function toDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function load(): WorkoutEntry[] {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function save(items: WorkoutEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function WorkoutWidget({ size }: { size: Size }) {
  const [entries, setEntries] = useState<WorkoutEntry[]>(load);
  const [type, setType] = useState('Run');
  const [minutes, setMinutes] = useState('30');
  const [note, setNote] = useState('');
  const today = toDateKey();

  useEffect(() => { save(entries); }, [entries]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseInt(minutes, 10);
    if (!min || min <= 0) return;
    setEntries((prev) => [{ id: Date.now(), type, minutes: min, note: note.trim(), date: today }, ...prev]);
    setNote('');
  };

  const remove = (id: number) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const todayEntries = entries.filter((e) => e.date === today);
  const todayTotal = todayEntries.reduce((s, e) => s + e.minutes, 0);
  const recentEntries = entries.slice(0, size.h >= 3 ? 8 : 4);

  return (
    <div className="w-body">
      <Head title="WORKOUT" right={
        todayTotal > 0 ? <span className="mono" style={{ fontSize: 10, color: 'var(--accent,#9aa6ff)' }}>今日 {todayTotal} min</span> : null
      } />
      <div className="w-content" style={{ gap: 8, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {recentEntries.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent,#9aa6ff)', flexShrink: 0, minWidth: 32 }}>{entry.type}</span>
              <span className="mono" style={{ fontSize: 11, flexShrink: 0 }}>{entry.minutes}m</span>
              {entry.note && size.w >= 3 && (
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.note}</span>
              )}
              {!entry.note && <span style={{ flex: 1 }} />}
              <span className="mono muted" style={{ fontSize: 9, opacity: 0.4, flexShrink: 0 }}>
                {entry.date === today ? '今日' : entry.date.slice(5)}
              </span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(entry.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}

          <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ width: 18, height: 18, border: '1.5px dashed var(--rule-strong)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-faint)', fontSize: 15, lineHeight: 1 }}>+</span>
            <select value={type} onChange={(e) => setType(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 6px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              min={1} max={300} placeholder="分"
              style={{ width: 50, background: 'var(--track)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 6px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none', textAlign: 'right' }} />
            <span className="mono muted" style={{ fontSize: 10 }}>min</span>
            {size.w >= 3 && (
              <input value={note} onChange={(e) => setNote(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="メモ"
                style={{ flex: 1, minWidth: 60, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }} />
            )}
            <button type="submit"
              style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#0a0d14', fontWeight: 600 }}>ADD</button>
          </form>
        </div>
      </div>
    </div>
  );
}
