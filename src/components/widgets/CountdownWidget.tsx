import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.countdowns.v1';

interface CountdownItem {
  id: number;
  name: string;
  date: string;
}

function load(): CountdownItem[] {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function save(items: CountdownItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function diffDays(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function fmtDiff(d: number): string {
  if (d === 0) return '今日!';
  if (d < 0) return `${Math.abs(d)}日前`;
  return `あと ${d}日`;
}

export function CountdownWidget({ size }: { size: Size }) {
  const [items, setItems] = useState<CountdownItem[]>(load);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { save(items); }, [items]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDate) return;
    setItems((prev) => [...prev, { id: Date.now(), name: newName.trim(), date: newDate }]);
    setNewName('');
  };

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const sorted = [...items].sort((a, b) => {
    const da = diffDays(a.date), db = diffDays(b.date);
    return Math.abs(da) - Math.abs(db);
  });

  return (
    <div className="w-body">
      <Head title="COUNTDOWN" right={
        <span className="mono muted" style={{ fontSize: 10 }}>{items.length} events</span>
      } />
      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {sorted.map((item) => {
            const d = diffDays(item.date);
            const past = d < 0;
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: size.w >= 3 ? 'row' : 'column', gap: size.w >= 3 ? 8 : 2, alignItems: size.w >= 3 ? 'center' : 'flex-start' }}>
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: past ? 0.45 : 1 }}>{item.name}</span>
                  <span className="mono" style={{ fontSize: 10, color: d === 0 ? 'var(--accent,#9aa6ff)' : past ? 'var(--ink-faint)' : 'var(--ink-mute)', whiteSpace: 'nowrap' }}>
                    {fmtDiff(d)}
                  </span>
                </div>
                <span className="mono muted" style={{ fontSize: 9, opacity: 0.5, flexShrink: 0 }}>{item.date}</span>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(item.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            );
          })}

          <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ width: 18, height: 18, border: '1.5px dashed var(--rule-strong)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-faint)', fontSize: 15, lineHeight: 1 }}>+</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="イベント名"
              style={{ flex: 1, minWidth: 80, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13 }} />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ background: 'var(--track)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 6px', color: 'inherit', font: 'inherit', fontSize: 11, outline: 'none', colorScheme: 'dark' }} />
            <button type="submit"
              style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#0a0d14', fontWeight: 600 }}>ADD</button>
          </form>
        </div>
      </div>
    </div>
  );
}
