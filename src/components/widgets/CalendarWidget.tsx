import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

// ─── Storage ──────────────────────────────────────────────────────

const CAL_KEY = 'wb.calendar.v1';       // { "2025-4": [3, 11] } manually-marked days
const ICS_KEY  = 'wb.cal.ics.v1';       // imported iCal events

interface ICSEvent { dateStr: string; title: string }

type EventsMap = Record<string, number[]>;

function loadCalEvents(): EventsMap {
  try {
    const p = JSON.parse(localStorage.getItem(CAL_KEY) ?? 'null');
    if (p && typeof p === 'object') return p as EventsMap;
  } catch {}
  const k = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  return { [k]: [3, 11, 15, 22, 28] };
}

function loadICSEvents(): ICSEvent[] {
  try { return JSON.parse(localStorage.getItem(ICS_KEY) ?? '[]') as ICSEvent[]; }
  catch { return []; }
}

// ─── iCal export ─────────────────────────────────────────────────

function exportICS(events: ICSEvent[]) {
  if (events.length === 0) return;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//window brain//EN',
    ...events.flatMap((ev) => {
      const d = ev.dateStr.replace(/-/g, '');
      return [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${d}`,
        `DTEND;VALUE=DATE:${d}`,
        `SUMMARY:${ev.title}`,
        `UID:${d}-${Math.random().toString(36).slice(2)}@window-brain`,
        'END:VEVENT',
      ];
    }),
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calendar-${new Date().toISOString().slice(0,10)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── iCal parser ─────────────────────────────────────────────────

function parseICS(content: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const blocks = content.split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    // Match date part of DTSTART (handles DATE, DATETIME, TZID variants)
    const dtstart = block.match(/DTSTART(?:[^:\n]*):(\d{8})/)?.[1];
    if (!dtstart) continue;
    const dateStr = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`;
    // Unfold SUMMARY (iCal line folding: continuation lines start with space/tab)
    const rawSummary = block.match(/SUMMARY:(.*(?:\r?\n[ \t].*)*)/)?.[1] ?? '(no title)';
    const title = rawSummary.replace(/\r?\n[ \t]/g, '').trim();
    events.push({ dateStr, title });
  }
  return events;
}

// ─── Component ────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function CalendarWidget() {
  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [eventsMap, setEventsMap] = useState<EventsMap>(loadCalEvents);
  const [icsEvents, setICSEvents] = useState<ICSEvent[]>(loadICSEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [icsUrl, setIcsUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(CAL_KEY, JSON.stringify(eventsMap)); } catch {}
  }, [eventsMap]);

  useEffect(() => {
    try { localStorage.setItem(ICS_KEY, JSON.stringify(icsEvents)); } catch {}
  }, [icsEvents]);

  useEffect(() => {
    const onUpdate = () => {
      setEventsMap(loadCalEvents());
      setICSEvents(loadICSEvents());
    };
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  // Calendar grid data
  const first = new Date(viewY, viewM, 1).getDay();
  const daysIn = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const monthKey = `${viewY}-${viewM}`;
  const manualEvents = eventsMap[monthKey] ?? [];
  const isTodayMonth = viewY === today.getFullYear() && viewM === today.getMonth();

  // ICS events for current view month
  const monthStr = `${viewY}-${String(viewM + 1).padStart(2, '0')}`;
  const icsForMonth = icsEvents.filter((e) => e.dateStr.startsWith(monthStr));
  const icsDayMap = new Map<number, string[]>();
  for (const ev of icsForMonth) {
    const day = parseInt(ev.dateStr.slice(8, 10), 10);
    const existing = icsDayMap.get(day) ?? [];
    icsDayMap.set(day, [...existing, ev.title]);
  }

  const toggleManual = (d: number) => {
    setEventsMap((em) => {
      const cur = em[monthKey] ?? [];
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a,b)=>a-b);
      return { ...em, [monthKey]: next };
    });
  };

  const step = (delta: number) => {
    let nm = viewM + delta, ny = viewY;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    setViewM(nm); setViewY(ny);
    setSelectedDay(null);
  };

  // Import from file
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseICS(text);
    setICSEvents((prev) => {
      // Merge, deduplicate by dateStr+title
      const existing = new Set(prev.map((ev) => `${ev.dateStr}|${ev.title}`));
      const newEvs = parsed.filter((ev) => !existing.has(`${ev.dateStr}|${ev.title}`));
      return [...prev, ...newEvs];
    });
    setImporting(false);
  };

  // Import from URL (iCal feed)
  const importFromUrl = async () => {
    if (!icsUrl.trim()) return;
    try {
      const r = await fetch(icsUrl.trim());
      const text = await r.text();
      const parsed = parseICS(text);
      setICSEvents((prev) => {
        const existing = new Set(prev.map((ev) => `${ev.dateStr}|${ev.title}`));
        const newEvs = parsed.filter((ev) => !existing.has(`${ev.dateStr}|${ev.title}`));
        return [...prev, ...newEvs];
      });
      setIcsUrl('');
      setImporting(false);
    } catch {
      alert('URL の読み込みに失敗しました。CORS に対応した URL を使用してください。');
    }
  };

  const clearICS = () => {
    setICSEvents([]);
    setImporting(false);
  };

  // Selected day events
  const selectedTitles = selectedDay ? (icsDayMap.get(selectedDay) ?? []) : [];

  return (
    <div className="w-body">
      <Head
        title="CALENDAR"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {icsEvents.length > 0 && (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => exportICS(icsEvents)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 2px' }} title="ICS エクスポート">↑</button>
            )}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setImporting(true); setTimeout(() => urlInputRef.current?.focus(), 30); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', padding: '1px 3px' }}
            >
              ICS ↓
            </button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => step(-1)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, padding: '0 4px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>‹</button>
            <span className="mono muted" style={{ fontSize: 10, minWidth: 56, textAlign: 'center' }}>{MONTH_NAMES[viewM]} {viewY}</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => step(1)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, padding: '0 4px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>›</button>
          </div>
        }
      />

      {/* Import overlay */}
      {importing && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 18 }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>iCAL インポート</div>

          {/* URL input */}
          <input
            ref={urlInputRef}
            value={icsUrl}
            onChange={(e) => setIcsUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') importFromUrl(); if (e.key === 'Escape') setImporting(false); }}
            placeholder="https://... (.ics URL)"
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 12, outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={importFromUrl} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>URL 読込</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#fff' }}>ファイル選択</button>
            {icsEvents.length > 0 && (
              <button onClick={clearICS} style={{ background: 'rgba(255,80,80,.2)', border: '.5px solid rgba(255,80,80,.3)', borderRadius: 7, padding: '7px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#ff8a8a' }}>クリア ({icsEvents.length})</button>
            )}
            <button onClick={() => setImporting(false)} style={{ background: 'rgba(255,255,255,.06)', border: '.5px solid rgba(255,255,255,.15)', borderRadius: 7, padding: '7px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.6)' }}>キャンセル</button>
          </div>

          <input ref={fileInputRef} type="file" accept=".ics,text/calendar" style={{ display: 'none' }} onChange={onFileChange} />
        </div>
      )}

      <div className="w-content" style={{ justifyContent: 'flex-start' }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 6, letterSpacing: '.12em' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ textAlign: 'center' }}>{d}</div>)}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 2, flex: 1, minHeight: 0, gridAutoRows: 'minmax(0,1fr)' }}>
          {cells.map((d, i) => {
            const isToday = isTodayMonth && d === today.getDate();
            const hasManual = d != null && manualEvents.includes(d);
            const icsCount = d != null ? (icsDayMap.get(d)?.length ?? 0) : 0;
            const hasICS = icsCount > 0;
            const isSelected = d === selectedDay;
            return (
              <div
                key={i}
                onPointerDown={d ? (e) => e.stopPropagation() : undefined}
                onClick={d ? () => {
                  if (hasICS) setSelectedDay(d === selectedDay ? null : d);
                  else { toggleManual(d); setSelectedDay(null); }
                } : undefined}
                onMouseEnter={d ? (e) => { if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--chip)'; } : undefined}
                onMouseLeave={d ? (e) => { if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; } : undefined}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, borderRadius: 6, minWidth: 0, minHeight: 0,
                  background: isToday ? 'var(--accent,#9aa6ff)' : isSelected ? 'var(--chip-hover)' : 'transparent',
                  color: isToday ? '#0a0d14' : (d ? 'inherit' : 'transparent'),
                  cursor: d ? 'pointer' : 'default',
                  transition: 'background .15s',
                  outline: isSelected && !isToday ? '1px solid var(--accent,#9aa6ff)' : 'none',
                  opacity: d ? 1 : .2,
                }}
              >
                {d ?? ''}
                {/* Dot indicators */}
                {(hasManual || hasICS) && !isToday && (
                  <div style={{ position: 'absolute', bottom: 1, display: 'flex', gap: 2 }}>
                    {hasManual && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent,#9aa6ff)' }} />}
                    {hasICS && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5dd6a0' }} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected day event details */}
        {selectedDay && selectedTitles.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '.5px solid var(--rule)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0 }}>
            <div className="mono muted" style={{ fontSize: 9, letterSpacing: '.14em' }}>{String(viewM + 1).padStart(2,'0')}/{String(selectedDay).padStart(2,'0')}</div>
            {selectedTitles.slice(0, 3).map((t, i) => (
              <div key={i} style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5dd6a0', flexShrink: 0, display: 'inline-block' }} />
                {t}
              </div>
            ))}
            {selectedTitles.length > 3 && (
              <div className="mono muted" style={{ fontSize: 9 }}>+{selectedTitles.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
