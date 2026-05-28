import { useState, useRef } from 'react';

const STORAGE_KEY = 'wb.widget.youtube.v1';
const DEFAULT_ID = 'jfKfPfyJRdk'; // lofi girl 24/7

function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

function loadVideoId(): string {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? DEFAULT_ID; }
  catch { return DEFAULT_ID; }
}

export function YouTubeWidget() {
  const [videoId, setVideoId] = useState(loadVideoId);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const applyUrl = () => {
    const id = parseYouTubeId(input);
    if (id) {
      setVideoId(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(id)); } catch {}
    }
    setEditing(false);
    setInput('');
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput('');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <div className="w-body" style={{ padding: 0 }}>
      {/* Header overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%)' }}>
        <div className="w-head" style={{ margin: 0, color: '#fff' }}>
          <div className="title">
            <span className="glyph" style={{ background: '#ff3355', boxShadow: '0 0 8px #ff3355' }}></span>
            YOUTUBE
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={startEditing}
          style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', border: '.5px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 6, padding: '3px 9px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer' }}
        >
          URL ✎
        </button>
      </div>

      {/* URL edit overlay */}
      {editing && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.88)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>YOUTUBE URL / VIDEO ID</div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="https://youtu.be/..."
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUrl} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditing(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube player"
      />
    </div>
  );
}
