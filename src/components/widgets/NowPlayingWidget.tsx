import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

export function NowPlayingWidget({ size }: { size: Size }) {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(102);
  const dur = 237;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos((p) => (p + 1) % dur), 1000);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="w-body">
      <Head title="NOW PLAYING" right={<span className="mono muted" style={{ fontSize: 10 }}>SPOTIFY</span>} />
      <div className="w-content" style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <div style={{ width: size.h >= 2 ? 72 : 48, height: size.h >= 2 ? 72 : 48, borderRadius: 8, background: 'linear-gradient(135deg,#2a3a78 0%,#7a3a8a 50%,#e85a6a 100%)', flexShrink: 0, boxShadow: '0 6px 20px rgba(232,90,106,.3)' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Strobe (Deadmau5)</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>For Lack of a Better Name</div>
          </div>
          <div>
            <div style={{ height: 2, background: 'var(--track)', borderRadius: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${pos / dur * 100}%`, background: 'currentColor', borderRadius: 1 }} />
            </div>
            <div className="mono muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
              <span>{fmt(pos)}</span><span>{fmt(dur)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setPlaying(!playing)}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--track)', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {playing
              ? <span style={{ display: 'flex', gap: 2 }}><span style={{ width: 3, height: 10, background: 'currentColor' }} /><span style={{ width: 3, height: 10, background: 'currentColor' }} /></span>
              : <svg width="9" height="10" viewBox="0 0 9 10"><path d="M0 0L9 5L0 10Z" fill="currentColor" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
