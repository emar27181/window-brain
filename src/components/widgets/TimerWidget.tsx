import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

const pad = (n: number) => String(n).padStart(2, '0');

type Mode = 'stopwatch' | 'countdown';
const STORAGE_KEY = 'wb.timer.v1';

function loadCountdownMins(): number {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? 10; }
  catch { return 10; }
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.25;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.stop(ctx.currentTime + 1.0);
  } catch {}
}

export function TimerWidget() {
  const [mode, setMode] = useState<Mode>('stopwatch');
  const [countdownMins, setCountdownMins] = useState<number>(loadCountdownMins);
  const [elapsed, setElapsed] = useState(0);     // ms (stopwatch)
  const [remaining, setRemaining] = useState(0); // s (countdown)
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [finished, setFinished] = useState(false);
  const baseRef = useRef(0);     // elapsed base at pause
  const startRef = useRef(0);    // performance.now() at last resume

  // Stopwatch interval
  useEffect(() => {
    if (mode !== 'stopwatch' || !running) return;
    startRef.current = performance.now() - baseRef.current;
    const id = setInterval(() => setElapsed(performance.now() - startRef.current), 50);
    return () => clearInterval(id);
  }, [mode, running]);

  // Countdown interval
  useEffect(() => {
    if (mode !== 'countdown' || !running) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setRunning(false);
          setFinished(true);
          playBeep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode, running]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setRunning(false);
    setElapsed(0);
    baseRef.current = 0;
    setRemaining(countdownMins * 60);
    setLaps([]);
    setFinished(false);
  };

  const toggleRun = () => {
    if (mode === 'stopwatch') {
      if (running) { baseRef.current = elapsed; }
      setRunning(r => !r);
    } else {
      if (finished) {
        setRemaining(countdownMins * 60);
        setFinished(false);
        setRunning(true);
      } else {
        setRunning(r => !r);
      }
    }
  };

  const reset = () => {
    setRunning(false);
    setFinished(false);
    if (mode === 'stopwatch') {
      setElapsed(0);
      baseRef.current = 0;
      setLaps([]);
    } else {
      setRemaining(countdownMins * 60);
    }
  };

  const lap = () => setLaps(ls => [elapsed, ...ls.slice(0, 4)]);

  const applyMins = (min: number) => {
    const v = Math.max(1, Math.min(180, min));
    setCountdownMins(v);
    setRemaining(v * 60);
    setRunning(false);
    setFinished(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
    setEditing(false);
  };

  // Stopwatch display
  const ms = elapsed;
  const swHrs = Math.floor(ms / 3_600_000);
  const swMins = Math.floor(ms / 60_000) % 60;
  const swSecs = Math.floor(ms / 1_000) % 60;
  const swCs = Math.floor(ms / 10) % 100;

  // Countdown display
  const cdMins = Math.floor(remaining / 60);
  const cdSecs = remaining % 60;

  const isStopwatch = mode === 'stopwatch';
  const hasElapsed = isStopwatch ? elapsed > 0 : remaining < countdownMins * 60;

  return (
    <div className="w-body">
      <Head
        title="TIMER"
        right={
          mode === 'countdown'
            ? <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => { setInputVal(String(countdownMins)); setEditing(true); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 4px' }}
              >{countdownMins}m ✎</button>
            : undefined
        }
      />

      {/* Countdown set overlay */}
      {editing && (
        <div onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20, borderRadius: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.5)' }}>COUNTDOWN (分)</div>
          <input
            type="number" min={1} max={180} value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyMins(Number(inputVal)); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            style={{ width: 72, background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '8px 10px', color: '#fff', font: 'inherit', fontSize: 20, outline: 'none', textAlign: 'center' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {[5, 10, 15, 30].map(m => (
              <button key={m} onPointerDown={e => e.stopPropagation()} onClick={() => applyMins(m)}
                style={{ background: countdownMins === m ? 'var(--accent)' : 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 7, padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', color: countdownMins === m ? '#0a0d14' : 'inherit' }}>
                {m}m
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => applyMins(Number(inputVal))} style={actionBtn('var(--accent)', '#0a0d14')}>SET</button>
            <button onClick={() => setEditing(false)} style={actionBtn('rgba(255,255,255,.08)', 'rgba(255,255,255,.7)')}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
          {(['stopwatch', 'countdown'] as Mode[]).map(m => (
            <button key={m} onPointerDown={e => e.stopPropagation()} onClick={() => switchMode(m)}
              style={{ background: mode === m ? 'var(--chip-hover)' : 'transparent', border: '.5px solid var(--rule)', borderRadius: 5, padding: '3px 9px', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.14em', cursor: 'pointer', color: mode === m ? 'inherit' : 'var(--ink-faint)', textTransform: 'uppercase' }}>
              {m === 'stopwatch' ? 'SW' : 'CD'}
            </button>
          ))}
        </div>

        {/* Display */}
        {isStopwatch ? (
          <div className="mono" style={{ fontSize: 28, letterSpacing: '-.02em', lineHeight: 1 }}>
            {swHrs > 0 && <span>{pad(swHrs)}:</span>}
            {pad(swMins)}:{pad(swSecs)}<span style={{ fontSize: 13, opacity: .45 }}>.{pad(swCs)}</span>
          </div>
        ) : (
          <div className="mono" style={{ fontSize: 30, letterSpacing: '-.02em', lineHeight: 1, color: finished ? 'var(--accent)' : 'inherit' }}>
            {pad(cdMins)}:{pad(cdSecs)}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onPointerDown={e => e.stopPropagation()} onClick={toggleRun} style={actionBtn('var(--accent)', '#0a0d14')}>
            {isStopwatch
              ? (running ? 'PAUSE' : elapsed > 0 ? 'RESUME' : 'START')
              : (finished ? 'RESTART' : running ? 'PAUSE' : remaining < countdownMins * 60 ? 'RESUME' : 'START')}
          </button>
          {isStopwatch && running && (
            <button onPointerDown={e => e.stopPropagation()} onClick={lap} style={actionBtn('var(--chip)', 'inherit')}>LAP</button>
          )}
          {hasElapsed && !running && (
            <button onPointerDown={e => e.stopPropagation()} onClick={reset} style={actionBtn('var(--chip)', 'inherit')}>RESET</button>
          )}
        </div>

        {/* Lap list */}
        {laps.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 52, overflow: 'auto', minWidth: 0 }}>
            {laps.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '.1em' }}>
                <span>LAP {laps.length - i}</span>
                <span>{pad(Math.floor(l / 60_000) % 60)}:{pad(Math.floor(l / 1_000) % 60)}.{pad(Math.floor(l / 10) % 100)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function actionBtn(bg: string, color: string): React.CSSProperties {
  return { background: bg, border: '.5px solid var(--rule)', borderRadius: 7, padding: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', cursor: 'pointer', color };
}
