import { useState, useEffect, useRef } from 'react';
import type { Size } from '../../types';
import { extractDominantColor, dispatchLiveColor } from '../../lib/colorExtract';

const STORAGE_KEY = 'wb.widget.music.v1';
const DEFAULT_V = 'jfKfPfyJRdk';

interface Embed { v?: string; list?: string }

function loadEmbed(): Embed {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: DEFAULT_V };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return { v: parsed };
    return parsed as Embed;
  } catch { return { v: DEFAULT_V }; }
}

function parseEmbed(input: string): Embed | null {
  const s = input.trim();
  const listM = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const list = listM?.[1];
  const videoM = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/(?!videoseries)|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const v = videoM?.[1] ?? (/^[a-zA-Z0-9_-]{11}$/.test(s) ? s : undefined);
  if (!v && !list) return null;
  return { v, list };
}

function buildSrc({ v, list }: Embed): string {
  const path = v
    ? `https://www.youtube.com/embed/${v}`
    : `https://www.youtube.com/embed/videoseries`;
  return `${path}?autoplay=1${list ? `&list=${list}` : ''}`;
}

interface Meta { title: string; author: string; thumb: string }

export function NowPlayingWidget({ size }: { size: Size }) {
  const [embed, setEmbed] = useState<Embed>(loadEmbed);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeKey = useRef(0);

  // Extract dominant color from thumbnail and broadcast as live accent
  useEffect(() => {
    if (!embed.v) { dispatchLiveColor(null); return; }
    const thumbUrl = `https://i.ytimg.com/vi/${embed.v}/hqdefault.jpg`;
    extractDominantColor(thumbUrl).then(dispatchLiveColor).catch(() => dispatchLiveColor(null));
  }, [embed.v]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setMeta(null);
    const oembedUrl = embed.v
      ? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${embed.v}&format=json`
      : embed.list
        ? `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${embed.list}&format=json`
        : null;
    if (!oembedUrl) return;
    fetch(oembedUrl)
      .then((r) => r.json())
      .then((d: { title: string; author_name: string; thumbnail_url: string }) => {
        if (alive) setMeta({ title: d.title, author: d.author_name, thumb: d.thumbnail_url });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [embed]);

  const applyUrl = () => {
    const next = parseEmbed(input);
    if (next) {
      iframeKey.current++;
      setEmbed(next);
      setPlaying(false);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
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

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    iframeKey.current++;
    setPlaying(true);
  };

  const albumSize = size.h >= 2 ? 72 : 48;

  return (
    <div className="w-body" style={{ padding: 0 }}>
      {playing && (
        <>
          <iframe
            key={iframeKey.current}
            src={buildSrc(embed)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Music player"
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', color: 'rgba(255,255,255,.7)', textTransform: 'uppercase' }}>NOW PLAYING</div>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={startEditing} style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', border: '.5px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 6, padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>URL ✎</button>
          </div>
        </>
      )}

      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.18em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>NOW PLAYING</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="mono muted" style={{ fontSize: 9, letterSpacing: '.1em' }}>YOUTUBE</span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={startEditing} style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '0 2px' }}>✎</button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 0, minWidth: 0 }}>
            <div style={{
              width: albumSize, height: albumSize, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg,#2a3a78 0%,#7a3a8a 50%,#e85a6a 100%)',
              boxShadow: '0 6px 20px rgba(0,0,0,.4)',
            }}>
              {meta?.thumb && (
                <img src={meta.thumb} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: size.h >= 2 ? 13 : 11, fontWeight: 500, letterSpacing: '-.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta?.title ?? 'lofi hip hop radio'}
              </div>
              <div className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta?.author ?? 'Lofi Girl'}
              </div>
              {size.h >= 2 && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handlePlay}
                  style={{ marginTop: 4, alignSelf: 'flex-start', background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 20, padding: '5px 14px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.14em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}
                >
                  ▶ PLAY
                </button>
              )}
            </div>

            {size.h < 2 && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handlePlay}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--track)', border: '.5px solid var(--rule-strong)', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="8" height="10" viewBox="0 0 8 10"><path d="M0 0L8 5L0 10Z" fill="currentColor" /></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 }}
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
    </div>
  );
}
