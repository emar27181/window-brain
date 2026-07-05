import { useState, useRef, useEffect, useCallback } from 'react';
import { useNow } from '../../hooks/useNow';

const STORAGE_PREFIX = 'wb.daycal.v1.';
const RANGE_START = 6 * 60;   // 06:00
const RANGE_END   = 24 * 60;  // 24:00
const PX_PER_MIN  = 1.4;

interface DayEvent { id: string; title: string; start: number; end: number; color: string }

const COLORS: Record<string, string> = {
  accent:  'var(--accent)',
  red:     '#ff6a7a',
  emerald: '#4fffb0',
  sky:     '#60b8ff',
  amber:   '#ffb347',
  violet:  '#c084fc',
};

function pad2(n: number) { return String(n).padStart(2, '0'); }
function minsToTime(m: number) { return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`; }
function timeToMins(s: string): number {
  const [h = 0, m = 0] = s.split(':').map(Number);
  return h * 60 + m;
}
function todayKey() {
  const d = new Date();
  return `${STORAGE_PREFIX}${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function loadEvents(): DayEvent[] {
  try { return JSON.parse(localStorage.getItem(todayKey()) ?? '[]') as DayEvent[]; } catch { return []; }
}
function persist(events: DayEvent[]) {
  try { localStorage.setItem(todayKey(), JSON.stringify(events)); } catch {}
}
function uid() { return Math.random().toString(36).slice(2, 9); }

interface FormState { id?: string; title: string; startStr: string; endStr: string; color: string }
const EMPTY_FORM = (startMins = 9 * 60): FormState => ({
  title: '', startStr: minsToTime(startMins), endStr: minsToTime(startMins + 60), color: 'accent',
});

export function DayCalendarWidget() {
  const now       = useNow(60000);
  const [events, setEvents] = useState<DayEvent[]>(loadEvents);
  const [form, setForm]     = useState<FormState | null>(null);
  const bodyRef   = useRef<HTMLDivElement>(null);

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowY    = (nowMins - RANGE_START) * PX_PER_MIN;

  // Scroll to current time on mount
  useEffect(() => {
    if (!bodyRef.current) return;
    const scrollTo = Math.max(0, nowY - bodyRef.current.clientHeight * 0.35);
    bodyRef.current.scrollTop = scrollTo;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback((next: DayEvent[]) => {
    setEvents(next);
    persist(next);
  }, []);

  const openNew = (e: React.MouseEvent<HTMLDivElement>) => {
    if (form) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top + (bodyRef.current?.scrollTop ?? 0);
    const clickMins = Math.round(clickY / PX_PER_MIN / 15) * 15 + RANGE_START;
    setForm(EMPTY_FORM(Math.min(Math.max(clickMins, RANGE_START), RANGE_END - 30)));
  };

  const saveForm = () => {
    if (!form) return;
    const start = timeToMins(form.startStr);
    const end   = timeToMins(form.endStr);
    if (!form.title.trim() || end <= start) return;
    const event: DayEvent = { id: form.id ?? uid(), title: form.title.trim(), start, end, color: form.color };
    commit(form.id ? events.map(e => e.id === form.id ? event : e) : [...events, event]);
    setForm(null);
  };

  const deleteEvent = () => {
    if (!form?.id) return;
    commit(events.filter(e => e.id !== form.id));
    setForm(null);
  };

  const totalH = (RANGE_END - RANGE_START) * PX_PER_MIN;
  const hours  = Array.from({ length: (RANGE_END - RANGE_START) / 60 + 1 }, (_, i) => RANGE_START + i * 60);

  return (
    <div className="w-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="w-head" style={{ padding: '12px 14px 8px', margin: 0, flexShrink: 0 }}>
        <div className="title"><span className="glyph"></span>TODAY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono muted" style={{ fontSize: 9 }}>
            {now.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' }).toUpperCase()}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setForm(EMPTY_FORM(nowMins))}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 5, width: 18, height: 18, color: '#0a0d14', fontSize: 14, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}
          >+</button>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={bodyRef}
        onPointerDown={e => e.stopPropagation()}
        onClick={openNew}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', scrollbarWidth: 'thin' }}
      >
        <div style={{ position: 'relative', height: totalH, minHeight: totalH }}>
          {/* Hour marks */}
          {hours.map(m => {
            const y = (m - RANGE_START) * PX_PER_MIN;
            const label = m < RANGE_END ? minsToTime(m) : null;
            return (
              <div key={m} style={{ position: 'absolute', top: y, left: 0, right: 0, display: 'flex', alignItems: 'flex-start', pointerEvents: 'none' }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '.06em', color: 'var(--ink-faint)', width: 34, textAlign: 'right', paddingRight: 6, lineHeight: '1', userSelect: 'none', flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--rule)', marginTop: '0.4em' }} />
              </div>
            );
          })}

          {/* Events */}
          {events.map(ev => {
            const top    = (ev.start - RANGE_START) * PX_PER_MIN;
            const height = Math.max((ev.end - ev.start) * PX_PER_MIN, 18);
            const color  = COLORS[ev.color] ?? COLORS.accent;
            const isNow  = nowMins >= ev.start && nowMins < ev.end;
            return (
              <div
                key={ev.id}
                onClick={e => { e.stopPropagation(); setForm({ id: ev.id, title: ev.title, startStr: minsToTime(ev.start), endStr: minsToTime(ev.end), color: ev.color }); }}
                style={{
                  position: 'absolute', top, left: 38, right: 6, height,
                  background: color, opacity: isNow ? 1 : 0.7,
                  borderRadius: 5, padding: '2px 6px', cursor: 'pointer',
                  boxSizing: 'border-box', overflow: 'hidden',
                  boxShadow: isNow ? `0 0 10px ${color}55` : 'none',
                  transition: 'opacity .15s',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', color: '#0a0d14', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.title}
                </div>
                {height > 28 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#0a0d1488', letterSpacing: '.04em' }}>
                    {minsToTime(ev.start)}–{minsToTime(ev.end)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Current time line */}
          {nowMins >= RANGE_START && nowMins <= RANGE_END && (
            <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginLeft: 31 }} />
              <div style={{ flex: 1, height: 1, background: 'var(--accent)', opacity: 0.8 }} />
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit form overlay */}
      {form && (
        <div
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 10, padding: 16, justifyContent: 'center' }}
        >
          <div className="mono" style={{ fontSize: 9, letterSpacing: '.18em', color: 'var(--ink-faint)' }}>{form.id ? 'EDIT EVENT' : 'NEW EVENT'}</div>

          <input
            autoFocus
            value={form.title}
            onChange={e => setForm(f => f && ({ ...f, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') saveForm(); if (e.key === 'Escape') setForm(null); }}
            placeholder="イベント名"
            style={{ background: 'var(--track)', border: '.5px solid var(--rule-strong)', borderRadius: 7, padding: '7px 10px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="mono muted" style={{ fontSize: 8, marginBottom: 4 }}>START</div>
              <input type="time" value={form.startStr} onChange={e => setForm(f => f && ({ ...f, startStr: e.target.value }))}
                style={{ background: 'var(--track)', border: '.5px solid var(--rule-strong)', borderRadius: 7, padding: '6px 8px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="mono muted" style={{ fontSize: 8, marginBottom: 4 }}>END</div>
              <input type="time" value={form.endStr} onChange={e => setForm(f => f && ({ ...f, endStr: e.target.value }))}
                style={{ background: 'var(--track)', border: '.5px solid var(--rule-strong)', borderRadius: 7, padding: '6px 8px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Color picker */}
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(COLORS).map(([key, val]) => (
              <button key={key} onPointerDown={e => e.stopPropagation()} onClick={() => setForm(f => f && ({ ...f, color: key }))}
                style={{ width: 18, height: 18, borderRadius: '50%', background: val, border: form.color === key ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button onClick={saveForm} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 7, padding: '7px 0', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 600 }}>SAVE</button>
            {form.id && <button onClick={deleteEvent} style={{ background: 'rgba(255,106,122,.18)', border: '.5px solid rgba(255,106,122,.35)', borderRadius: 7, padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', color: '#ff6a7a' }}>DEL</button>}
            <button onClick={() => setForm(null)} style={{ background: 'var(--track)', border: '.5px solid var(--rule-strong)', borderRadius: 7, padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', color: 'var(--ink-mute)' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
