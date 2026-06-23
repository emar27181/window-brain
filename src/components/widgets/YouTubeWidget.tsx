import { useState, useRef, useEffect } from 'react';

const DEFAULT_V = 'jfKfPfyJRdk';

interface Embed { v?: string; list?: string }
interface PlayerState { volume: number; muted: boolean }

function embedKey(widgetId?: string) {
  return widgetId ? `wb.widget.youtube.v1.${widgetId}` : 'wb.widget.youtube.v1';
}
function resumeKey(widgetId?: string) {
  return widgetId ? `wb.widget.youtube.resume.v1.${widgetId}` : 'wb.widget.youtube.resume.v1';
}
function stateKey(widgetId?: string) {
  return widgetId ? `wb.widget.youtube.state.v1.${widgetId}` : 'wb.widget.youtube.state.v1';
}

function loadEmbed(widgetId?: string): Embed {
  try {
    const raw = localStorage.getItem(embedKey(widgetId));
    if (!raw) return { v: DEFAULT_V };
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? { v: parsed } : (parsed as Embed);
  } catch { return { v: DEFAULT_V }; }
}

function parseEmbed(input: string): Embed | null {
  const s = input.trim();
  const videoM = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/(?!videoseries)|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const v = videoM?.[1] ?? (/^[a-zA-Z0-9_-]{11}$/.test(s) ? s : undefined);
  // Only treat as playlist when there is no specific video ID to avoid player errors
  const list = v ? undefined : s.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1];
  if (!v && !list) return null;
  return { v, list };
}

function loadResume(videoId: string, widgetId?: string): number {
  try {
    const saved = JSON.parse(localStorage.getItem(resumeKey(widgetId)) ?? '{}') as Record<string, number>;
    const t = Number(saved[videoId] ?? 0);
    return t > 5 && t < 86400 ? t : 0;
  } catch { return 0; }
}

function saveResume(videoId: string, t: number, widgetId?: string) {
  if (!(t > 5 && t < 86400)) return;
  try {
    const saved = JSON.parse(localStorage.getItem(resumeKey(widgetId)) ?? '{}') as Record<string, number>;
    saved[videoId] = Math.floor(t);
    localStorage.setItem(resumeKey(widgetId), JSON.stringify(saved));
  } catch {}
}

function loadPlayerState(widgetId?: string): PlayerState {
  try {
    const raw = localStorage.getItem(stateKey(widgetId));
    if (!raw) return { volume: 100, muted: false };
    return JSON.parse(raw) as PlayerState;
  } catch { return { volume: 100, muted: false }; }
}

function savePlayerState(state: PlayerState, widgetId?: string) {
  try {
    localStorage.setItem(stateKey(widgetId), JSON.stringify(state));
  } catch {}
}

let _ytPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (_ytPromise) return _ytPromise;
  _ytPromise = new Promise<void>((resolve) => {
    if ((window as any).YT?.Player) { resolve(); return; }
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return _ytPromise;
}

export function YouTubeWidget({ widgetId }: { size?: { w: number; h: number }; widgetId?: string }) {
  const [embed, setEmbed]     = useState<Embed>(() => loadEmbed(widgetId));
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const [active, setActive]   = useState(false); // false = poster, true = player
  const [thumbErr, setThumbErr] = useState(false);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<any>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset to poster when embed changes
  useEffect(() => { setActive(false); setThumbErr(false); }, [embed]);

  // Reload from localStorage after import
  useEffect(() => {
    const onUpdate = () => { setEmbed(loadEmbed(widgetId)); setActive(false); };
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, [widgetId]);

  // Build / tear down YT player when active
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const videoId  = embed.v;
    const startSec = videoId ? loadResume(videoId, widgetId) : 0;
    let alive = true;

    const stopTick = () => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
    const startTick = (vid: string) => {
      stopTick();
      tickRef.current = setInterval(() => {
        try {
          const t = playerRef.current?.getCurrentTime?.() ?? 0;
          saveResume(vid, t, widgetId);
          const vol = playerRef.current?.getVolume?.() ?? 100;
          const muted = playerRef.current?.isMuted?.() ?? false;
          savePlayerState({ volume: vol, muted }, widgetId);
        } catch {}
      }, 5000);
    };

    loadYTApi().then(() => {
      if (!alive || !containerRef.current) return;
      const YT = (window as any).YT;
      if (!YT?.Player) return;

      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      containerRef.current.innerHTML = '';
      const inner = document.createElement('div');
      containerRef.current.appendChild(inner);

      const vars: Record<string, unknown> = { autoplay: 1, start: Math.floor(startSec), rel: 0, modestbranding: 1 };
      if (embed.list) { vars.list = embed.list; vars.listType = 'playlist'; }

      playerRef.current = new YT.Player(inner, {
        width: '100%', height: '100%',
        videoId: embed.v,
        playerVars: vars,
        events: {
          onReady: (e: { target: any }) => {
            const ps = loadPlayerState(widgetId);
            if (ps.muted) {
              e.target.mute();
            } else {
              e.target.unMute();
              e.target.setVolume(ps.volume);
            }
            // Prevent links inside the player from opening new tabs
            const iframe = containerRef.current?.querySelector('iframe');
            if (iframe && !iframe.hasAttribute('sandbox')) {
              iframe.setAttribute('sandbox',
                'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups'
              );
            }
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1 && videoId) startTick(videoId);
            else stopTick();
          },
        },
      });
    });

    return () => {
      alive = false;
      stopTick();
      try {
        const t = playerRef.current?.getCurrentTime?.() ?? 0;
        if (videoId) saveResume(videoId, t, widgetId);
        const vol = playerRef.current?.getVolume?.() ?? 100;
        const muted = playerRef.current?.isMuted?.() ?? false;
        savePlayerState({ volume: vol, muted }, widgetId);
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
  }, [active, embed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!embed.v) return;
    const videoId = embed.v;
    const onUnload = () => {
      try {
        const t = playerRef.current?.getCurrentTime?.() ?? 0;
        saveResume(videoId, t, widgetId);
        const vol = playerRef.current?.getVolume?.() ?? 100;
        const muted = playerRef.current?.isMuted?.() ?? false;
        savePlayerState({ volume: vol, muted }, widgetId);
      } catch {}
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [embed.v, widgetId]);

  const applyUrl = () => {
    const next = parseEmbed(input);
    if (next) {
      setEmbed(next);
      try { localStorage.setItem(embedKey(widgetId), JSON.stringify(next)); } catch {}
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

  const thumbUrl = embed.v
    ? (thumbErr
        ? `https://i.ytimg.com/vi/${embed.v}/hqdefault.jpg`
        : `https://i.ytimg.com/vi/${embed.v}/maxresdefault.jpg`)
    : null;

  return (
    <div className="w-body" style={{ padding: 0 }}>
      {/* Header overlay */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%)', pointerEvents: 'none' }}>
        <div className="w-head" style={{ margin: 0, color: '#fff', pointerEvents: 'none' }}>
          <div className="title">
            <span className="glyph" style={{ background: '#ff3355', boxShadow: '0 0 8px #ff3355' }} />
            YOUTUBE
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={startEditing}
          style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', border: '.5px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 6, padding: '3px 9px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', cursor: 'pointer', pointerEvents: 'auto' }}
        >
          URL ✎
        </button>
      </div>

      {/* Poster — shown when not active */}
      {!active && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setActive(true)}
          style={{ position: 'absolute', inset: 0, border: 'none', padding: 0, cursor: 'pointer', background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 'inherit' }}
        >
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              onError={() => { if (!thumbErr) setThumbErr(true); }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .85 }}
            />
          )}
          {/* Play button */}
          <div style={{ position: 'relative', zIndex: 1, width: 52, height: 36, borderRadius: 8, background: 'rgba(255,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 16px rgba(0,0,0,.5)', transition: 'transform .15s' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <polygon points="5,2 14,8 5,14" />
            </svg>
          </div>
          {/* Resume indicator */}
          {embed.v && loadResume(embed.v, widgetId) > 0 && (
            <div style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)', background: 'rgba(0,0,0,.5)', borderRadius: 4, padding: '2px 6px', zIndex: 2 }}>
              ↩ resume
            </div>
          )}
        </button>
      )}

      {/* URL edit overlay */}
      {editing && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.88)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>YOUTUBE URL / VIDEO ID / PLAYLIST</div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="https://youtu.be/... or playlist URL"
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUrl} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditing(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* YT player container — mounted when active */}
      {active && <div ref={containerRef} className="yt-player" style={{ position: 'absolute', inset: 0 }} />}
    </div>
  );
}
