import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import { useNow } from '../../hooks/useNow';

const STORAGE_KEY = 'wb.alarms.v1';
const pad = (n: number) => String(n).padStart(2, '0');

interface Alarm { id: string; time: string; label: string; enabled: boolean }

function loadAlarms(): Alarm[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function saveAlarms(alarms: Alarm[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms)); } catch {}
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {}
}

function minutesUntil(timeStr: string, now: Date): number {
  const [h, m] = timeStr.split(':').map(Number);
  const target = h * 60 + m;
  const current = now.getHours() * 60 + now.getMinutes();
  const diff = target - current;
  return diff >= 0 ? diff : diff + 1440;
}

export function AlarmWidget() {
  const now = useNow(10_000);
  const [alarms, setAlarms] = useState<Alarm[]>(loadAlarms);
  const [adding, setAdding] = useState(false);
  const [newTime, setNewTime] = useState(() => `${pad(new Date().getHours() + 1)}:00`);
  const [newLabel, setNewLabel] = useState('');
  const [ringing, setRinging] = useState<string | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  // Alarm check (1-min resolution)
  useEffect(() => {
    const hh = now.getHours();
    const mm = now.getMinutes();
    const timeStr = `${pad(hh)}:${pad(mm)}`;
    alarms.forEach(alarm => {
      if (!alarm.enabled) return;
      const key = `${alarm.id}-${timeStr}`;
      if (alarm.time === timeStr && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        setRinging(alarm.id);
        playBeep();
      }
    });
  }, [now, alarms]);

  const addAlarm = () => {
    const alarm: Alarm = {
      id: Date.now().toString(36),
      time: newTime,
      label: newLabel.trim() || newTime,
      enabled: true,
    };
    const next = [...alarms, alarm].sort((a, b) => a.time.localeCompare(b.time));
    setAlarms(next);
    saveAlarms(next);
    setAdding(false);
    setNewLabel('');
  };

  const toggleAlarm = (id: string) => {
    const next = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlarms(next);
    saveAlarms(next);
  };

  const removeAlarm = (id: string) => {
    const next = alarms.filter(a => a.id !== id);
    setAlarms(next);
    saveAlarms(next);
    if (ringing === id) setRinging(null);
  };

  return (
    <div className="w-body">
      <Head
        title="ALARM"
        right={
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => { setNewTime(`${pad(new Date().getHours() + 1)}:00`); setAdding(true); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 4px' }}
          >+ ADD</button>
        }
      />

      {/* Ringing overlay */}
      {ringing && (
        <div onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(198,160,255,.12)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28 }}>◎</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '.18em', color: 'var(--accent)' }}>
            {alarms.find(a => a.id === ringing)?.time ?? ''}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--ink-mute)' }}>
            {alarms.find(a => a.id === ringing)?.label ?? 'ALARM'}
          </div>
          <button onPointerDown={e => e.stopPropagation()} onClick={() => setRinging(null)}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '6px 20px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>
            DISMISS
          </button>
        </div>
      )}

      {/* Add alarm overlay */}
      {adding && (
        <div onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, borderRadius: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.5)' }}>NEW ALARM</div>
          <input
            type="time" value={newTime}
            onChange={e => setNewTime(e.target.value)}
            style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '8px 14px', color: '#fff', font: 'inherit', fontSize: 22, outline: 'none', textAlign: 'center', colorScheme: 'dark' }}
          />
          <input
            type="text" placeholder="ラベル（省略可）" value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addAlarm(); if (e.key === 'Escape') setAdding(false); }}
            style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '7px 12px', color: '#fff', font: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addAlarm} style={{ background: 'var(--accent)', border: 'none', borderRadius: 7, padding: '6px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setAdding(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '6px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ flexDirection: 'column', gap: 5, justifyContent: 'flex-start', overflow: 'auto', minWidth: 0 }}>
        {alarms.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--ink-faint)', textAlign: 'center', paddingTop: 6 }}>NO ALARMS</div>
        ) : (
          alarms.map(alarm => {
            const mins = minutesUntil(alarm.time, now);
            const untilStr = alarm.enabled
              ? mins === 0 ? 'NOW' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`
              : '—';
            return (
              <div key={alarm.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '.5px solid var(--rule)', minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 15, fontWeight: 400, letterSpacing: '-.01em', flexShrink: 0, opacity: alarm.enabled ? 1 : .3 }}>
                  {alarm.time}
                </div>
                <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: alarm.enabled ? 1 : .3, minWidth: 0 }}>
                  {alarm.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'var(--accent)', flexShrink: 0, opacity: alarm.enabled ? 1 : .3 }}>
                  {untilStr}
                </div>
                <button
                  onPointerDown={e => e.stopPropagation()} onClick={() => toggleAlarm(alarm.id)}
                  style={{ flexShrink: 0, width: 22, height: 13, borderRadius: 7, border: 'none', cursor: 'pointer', background: alarm.enabled ? 'var(--accent)' : 'var(--chip)', padding: 0 }}
                />
                <button
                  onPointerDown={e => e.stopPropagation()} onClick={() => removeAlarm(alarm.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
