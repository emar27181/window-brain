import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.habits.v1';

interface Habit {
  id: number;
  name: string;
  doneMap: Record<string, boolean>;
}

function toDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function calcStreak(doneMap: Record<string, boolean>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!doneMap[toDateKey(d)]) break;
    streak++;
  }
  return streak;
}

function load(): Habit[] {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function save(items: Habit[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function HabitWidget({ size }: { size: Size }) {
  const [habits, setHabits] = useState<Habit[]>(load);
  const [newName, setNewName] = useState('');
  const today = toDateKey();

  useEffect(() => { save(habits); }, [habits]);

  const toggle = (id: number) => {
    setHabits((prev) => prev.map((h) =>
      h.id !== id ? h : { ...h, doneMap: { ...h.doneMap, [today]: !h.doneMap[today] } }
    ));
  };

  const remove = (id: number) => setHabits((prev) => prev.filter((h) => h.id !== id));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setHabits((prev) => [...prev, { id: Date.now(), name: newName.trim(), doneMap: {} }]);
    setNewName('');
  };

  const doneCount = habits.filter((h) => h.doneMap[today]).length;

  return (
    <div className="w-body">
      <Head title="HABITS" right={
        <span className="mono muted" style={{ fontSize: 10 }}>{doneCount}/{habits.length}</span>
      } />
      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {habits.map((habit) => {
            const done = !!habit.doneMap[today];
            const streak = calcStreak(habit.doneMap);
            return (
              <div key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(habit.id)}
                  style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--rule-strong)', background: done ? 'var(--accent,#9aa6ff)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0, transition: 'all .15s' }}>
                  {done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5L4 7.5L8.5 2" stroke="#0a0d14" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, opacity: done ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</span>
                {streak > 0 && size.w >= 2 && (
                  <span className="mono" style={{ fontSize: 10, color: 'var(--accent,#9aa6ff)', flexShrink: 0 }}>{streak}🔥</span>
                )}
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(habit.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            );
          })}

          <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', flexShrink: 0 }}>
            <span style={{ width: 18, height: 18, border: '1.5px dashed var(--rule-strong)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-faint)', fontSize: 15, lineHeight: 1 }}>+</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="新しい習慣"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13 }} />
            <button type="submit"
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>ADD</button>
          </form>
        </div>
      </div>
    </div>
  );
}
