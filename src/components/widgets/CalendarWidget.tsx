import { useState, useEffect } from 'react';
import { Head } from '../Head';

const CAL_KEY = 'wb.calendar.v1';

type EventsMap = Record<string, number[]>;

function loadCalEvents(): EventsMap {
  try {
    const raw = localStorage.getItem(CAL_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return p as EventsMap;
    }
  } catch {}
  const k = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  return { [k]: [3, 11, 15, 22, 28] };
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function CalendarWidget() {
  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [eventsMap, setEventsMap] = useState<EventsMap>(loadCalEvents);

  useEffect(() => {
    try { localStorage.setItem(CAL_KEY, JSON.stringify(eventsMap)); } catch {}
  }, [eventsMap]);

  useEffect(() => {
    const onUpdate = () => setEventsMap(loadCalEvents());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const first = new Date(viewY, viewM, 1).getDay();
  const daysIn = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const monthKey = `${viewY}-${viewM}`;
  const events = eventsMap[monthKey] ?? [];
  const isTodayMonth = viewY === today.getFullYear() && viewM === today.getMonth();

  const toggleEvent = (d: number) => {
    setEventsMap((em) => {
      const cur = em[monthKey] ?? [];
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
      return { ...em, [monthKey]: next };
    });
  };

  const step = (delta: number) => {
    let nm = viewM + delta, ny = viewY;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    setViewM(nm); setViewY(ny);
  };

  return (
    <div className="w-body">
      <Head
        title="CALENDAR"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => step(-1)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, padding: '0 4px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>‹</button>
            <span className="mono muted" style={{ fontSize: 10, minWidth: 64, textAlign: 'center' }}>{MONTH_NAMES[viewM]} {viewY}</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => step(1)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, padding: '0 4px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>›</button>
          </div>
        }
      />
      <div className="w-content" style={{ justifyContent: 'flex-start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 6, letterSpacing: '.12em' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ textAlign: 'center' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 2, flex: 1, minHeight: 0, gridAutoRows: 'minmax(0,1fr)' }}>
          {cells.map((d, i) => {
            const isToday = isTodayMonth && d === today.getDate();
            const hasEvent = d != null && events.includes(d);
            return (
              <div
                key={i}
                onPointerDown={d ? (e) => e.stopPropagation() : undefined}
                onClick={d ? () => toggleEvent(d) : undefined}
                onMouseEnter={d ? (e) => { if (!isToday) (e.currentTarget as HTMLElement).style.background = 'var(--chip)'; } : undefined}
                onMouseLeave={d ? (e) => { if (!isToday) (e.currentTarget as HTMLElement).style.background = 'transparent'; } : undefined}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, borderRadius: 6, minWidth: 0, minHeight: 0,
                  background: isToday ? 'var(--accent,#9aa6ff)' : 'transparent',
                  color: isToday ? '#0a0d14' : (d ? 'inherit' : 'transparent'),
                  cursor: d ? 'pointer' : 'default',
                  transition: 'background .15s',
                  opacity: d ? 1 : .2,
                }}
              >
                {d ?? ''}
                {hasEvent && !isToday && (
                  <div style={{ position: 'absolute', bottom: 2, width: 3, height: 3, borderRadius: '50%', background: 'var(--accent,#9aa6ff)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
