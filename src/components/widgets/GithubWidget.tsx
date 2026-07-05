import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.widget.github.v1';
const DEFAULT_USER = 'emar27181';

function loadUsername(): string {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? DEFAULT_USER; }
  catch { return DEFAULT_USER; }
}

interface ContribData {
  cells: number[];  // 84 values, level 0-4, column-major (7 rows × 12 cols)
  total: number;
  streak: number;
  today: number;
}

function buildHeatmap(events: Array<{ created_at: string }>): ContribData {
  const dayCounts: Record<string, number> = {};
  for (const ev of events) {
    const d = ev.created_at.slice(0, 10);
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const counts = days.map((d) => dayCounts[d] ?? 0);
  const cells = counts.map((n) => n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);

  const total = counts.reduce((a, b) => a + b, 0);
  const todayCount = counts[counts.length - 1];

  let streak = 0;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) streak++;
    else break;
  }

  return { cells, total, streak, today: todayCount };
}

async function fetchContribs(username: string, signal: AbortSignal): Promise<ContribData> {
  const pages = await Promise.all([1, 2, 3].map((page) =>
    fetch(`https://api.github.com/users/${username}/events?per_page=100&page=${page}`, { signal })
      .then((r) => r.ok ? r.json() as Promise<Array<{ created_at: string }>> : [])
      .catch(() => [] as Array<{ created_at: string }>)
  ));
  return buildHeatmap(pages.flat());
}

const LEVELS = [
  'var(--track-soft)',
  'rgba(154,166,255,.22)',
  'rgba(154,166,255,.44)',
  'rgba(154,166,255,.68)',
  'var(--accent,#9aa6ff)',
];

export function GithubWidget({ size }: { size: Size }) {
  const [username, setUsername] = useState(loadUsername);
  const [data, setData] = useState<ContribData | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [err, setErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    setErr(false);
    const load = async () => {
      try {
        const d = await fetchContribs(username, ctrl.signal);
        if (alive) setData(d);
      } catch {
        if (alive) setErr(true);
      }
    };
    load();
    return () => { alive = false; ctrl.abort(); };
  }, [username]);

  const applyUsername = () => {
    const u = input.trim();
    if (u) {
      setUsername(u);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
    }
    setEditing(false);
    setInput('');
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput(username);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <div className="w-body">
      <Head
        title="COMMITS"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={startEditing}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', padding: '2px 4px' }}
            >
              @{username}
            </button>
            {data && <span className="mono muted" style={{ fontSize: 10 }}>{data.total} · 12W</span>}
          </div>
        }
      />
      <div className="w-content" style={{ justifyContent: 'center' }}>
        {editing && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.88)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 18 }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>GITHUB USERNAME</div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyUsername(); if (e.key === 'Escape') setEditing(false); }}
              placeholder="username"
              style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={applyUsername} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
              <button onClick={() => setEditing(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
            </div>
          </div>
        )}

        {err && (
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em' }}>
            API rate limit or user not found
          </div>
        )}

        {!err && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gridTemplateRows: 'repeat(7,1fr)', gap: 3, flex: 1, gridAutoFlow: 'column', maxHeight: size.h >= 2 ? '100%' : 54 }}>
            {(data?.cells ?? Array(84).fill(0)).map((v, i) => (
              <div key={i} style={{ background: LEVELS[v as number], borderRadius: 2, aspectRatio: '1' }} />
            ))}
          </div>
        )}

        {size.h >= 2 && data && (
          <div className="mono muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '.14em', marginTop: 10 }}>
            <span>STREAK {data.streak}d</span>
            <span>TODAY {data.today}</span>
          </div>
        )}
      </div>
    </div>
  );
}
