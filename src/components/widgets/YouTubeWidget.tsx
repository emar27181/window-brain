import { useState, useRef, useEffect } from 'react';
import { extractDominantColor, dispatchLiveColor } from '../../lib/colorExtract';
import { copyToClipboard } from '../../lib/copyToClipboard';

const DEFAULT_V = 'jfKfPfyJRdk';

interface Embed { provider?: 'youtube' | 'twitch'; v?: string; list?: string; channel?: string; vod?: string; clip?: string }
interface PlaylistItem { title: string; link: string; pubDate?: string }
interface SavedTemplate { id: string; name: string; media: Embed; items?: PlaylistItem[]; savedAt: string }
const TEMPLATE_KEY = 'wb.media.templates.v1';
interface PlayerState { volume: number; muted: boolean }

function embedKey(widgetId?: string) {
  return widgetId ? `wb.widget.youtube.v1.${widgetId}` : 'wb.widget.youtube.v1';
}
function resumeKey(widgetId?: string) {
  return widgetId ? `wb.widget.youtube.resume.v1.${widgetId}` : 'wb.widget.youtube.resume.v1';
}
function playlistCacheKey(widgetId?: string) { return widgetId ? 'wb.media.playlist.v1.' + widgetId : 'wb.media.playlist.v1'; }
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
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return { provider: 'youtube', v: s };
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (['twitch.tv', 'm.twitch.tv', 'clips.twitch.tv', 'player.twitch.tv'].includes(host)) {
      const parts = url.pathname.split('/').filter(Boolean);
      const clipIndex = parts.indexOf('clip');
      const clip = url.searchParams.get('clip') ?? (host === 'clips.twitch.tv' ? (parts[0] === 'embed' ? undefined : parts[0]) : (clipIndex >= 0 ? parts[clipIndex + 1] : undefined));
      const videoIndex = parts.indexOf('videos');
      const vod = url.searchParams.get('video') ?? (videoIndex >= 0 ? parts[videoIndex + 1] : undefined);
      const channel = url.searchParams.get('channel') ?? (videoIndex < 0 && clipIndex < 0 && host !== 'clips.twitch.tv' ? parts[0] : undefined);
      if (clip) return { provider: 'twitch', clip };
      if (vod) return { provider: 'twitch', vod: vod.replace(/^v/, '') };
      if (channel && !['directory', 'downloads', 'jobs', 'settings'].includes(channel)) return { provider: 'twitch', channel };
      return null;
    }
    if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'].includes(host)) return null;
    const list = url.searchParams.get('list') ?? undefined;
    const videoPath = url.pathname.match(/(?:^|\/)(?:embed\/(?!videoseries)|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    const v = url.searchParams.get('v') ?? videoPath?.[1] ?? (host === 'youtu.be' ? url.pathname.split('/').filter(Boolean)[0] : undefined);
    if (!v && !list) return null;
    return { provider: 'youtube', v: v?.slice(0, 11), list };
  } catch { return null; }
}

function loadTemplates(): SavedTemplate[] {
  try {
    const value = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((x) => x && typeof x.name === 'string' && x.media) : [];
  } catch { return []; }
}

function twitchEmbedUrl(embed: Embed): string {
  const parent = encodeURIComponent(window.location.hostname);
  const base = 'https://player.twitch.tv/?parent=' + parent + '&autoplay=false&muted=true';
  if (embed.clip) return 'https://clips.twitch.tv/embed?clip=' + encodeURIComponent(embed.clip) + '&parent=' + parent;
  if (embed.vod) return base + '&video=v' + encodeURIComponent(embed.vod);
  return base + '&channel=' + encodeURIComponent(embed.channel ?? '');
}

function mediaUrl(value: Embed): string {
  if (value.provider === 'twitch') return value.clip ? 'https://clips.twitch.tv/' + value.clip : value.vod ? 'https://www.twitch.tv/videos/' + value.vod : 'https://www.twitch.tv/' + (value.channel ?? '');
  return value.list ? 'https://www.youtube.com/playlist?list=' + value.list : value.v ? 'https://www.youtube.com/watch?v=' + value.v : '';
}

function downloadTemplate(media: Embed, name = 'Media', items: PlaylistItem[] = []) {
  const payload = { version: 'wb.media-template.v1', exportedAt: new Date().toISOString(), name, media, items };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'window-brain-' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'media') + '.json';
  a.click();
  URL.revokeObjectURL(url);
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

function VolIcon({ muted, vol }: { muted: boolean; vol: number }) {
  if (muted || vol === 0) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
    </svg>
  );
  if (vol < 50) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  );
}

export function YouTubeWidget({ widgetId }: { size?: { w: number; h: number }; widgetId?: string }) {
  const [embed, setEmbed]     = useState<Embed>(() => loadEmbed(widgetId));
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const [active, setActive]   = useState(false); // false = poster, true = player
  const [thumbErr, setThumbErr] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>(loadTemplates);
  const [copied, setCopied] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Volume control state
  const [volVal,   setVolVal]   = useState(100);
  const [volMuted, setVolMuted] = useState(false);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<any>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync volume display from player
  const syncVol = () => {
    try {
      setVolVal(playerRef.current?.getVolume?.() ?? 100);
      setVolMuted(playerRef.current?.isMuted?.() ?? false);
    } catch {}
  };

  // Reset to poster when embed changes
  useEffect(() => { setActive(false); setThumbErr(false); setShowPlaylist(false); }, [embed]);

  useEffect(() => {
    if (!embed.list || embed.provider === 'twitch') { setPlaylistItems([]); return; }
    let alive = true;
    try { setPlaylistItems(JSON.parse(localStorage.getItem(playlistCacheKey(widgetId)) ?? '[]') as PlaylistItem[]); }
    catch { setPlaylistItems([]); }
    const feed = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + encodeURIComponent(embed.list);
    fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed) + '&count=20')
      .then((response) => response.json())
      .then((data: { status?: string; items?: PlaylistItem[] }) => {
        if (alive && data.status === 'ok' && Array.isArray(data.items)) {
          setPlaylistItems(data.items);
          try { localStorage.setItem(playlistCacheKey(widgetId), JSON.stringify(data.items)); } catch {}
        }
      })
      .catch(() => {
        if (!alive) return;
        try { setPlaylistItems(JSON.parse(localStorage.getItem(playlistCacheKey(widgetId)) ?? '[]') as PlaylistItem[]); }
        catch { setPlaylistItems([]); }
      });
    return () => { alive = false; };
  }, [embed.list, embed.provider, widgetId]);

  // Extract dominant color from thumbnail and broadcast as live accent
  useEffect(() => {
    if (!embed.v) { dispatchLiveColor(null); return; }
    const url = thumbErr
      ? `https://i.ytimg.com/vi/${embed.v}/hqdefault.jpg`
      : `https://i.ytimg.com/vi/${embed.v}/maxresdefault.jpg`;
    extractDominantColor(url).then(dispatchLiveColor).catch(() => dispatchLiveColor(null));
  }, [embed.v, thumbErr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload from localStorage after import
  useEffect(() => {
    const onUpdate = () => { setEmbed(loadEmbed(widgetId)); setTemplates(loadTemplates()); setActive(false); };
    const onTemplates = () => setTemplates(loadTemplates());
    window.addEventListener('wb:data-updated', onUpdate);
    window.addEventListener('wb:templates-updated', onTemplates);
    return () => {
      window.removeEventListener('wb:data-updated', onUpdate);
      window.removeEventListener('wb:templates-updated', onTemplates);
    };
  }, [widgetId]);

  // Build / tear down YT player when active
  useEffect(() => {
    if (!active || embed.provider === 'twitch' || !containerRef.current) return;
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

  const persistEmbed = (next: Embed) => {
    setEmbed(next);
    try { localStorage.setItem(embedKey(widgetId), JSON.stringify(next)); } catch {}
  };

  const saveTemplate = () => {
    const name = window.prompt('テンプレート名', embed.list ? 'YouTube Playlist' : embed.channel ? 'Twitch ' + embed.channel : 'Media');
    if (!name?.trim()) return;
    const next = [{ id: crypto.randomUUID(), name: name.trim(), media: embed, items: playlistItems, savedAt: new Date().toISOString() }, ...templates].slice(0, 40);
    setTemplates(next);
    try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent('wb:templates-updated'));
  };

  const importTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as { version?: string; media?: Embed; name?: string; items?: PlaylistItem[] };
      if (data.version !== 'wb.media-template.v1' || !data.media || !parseEmbed(mediaUrl(data.media))) throw new Error('invalid template');
      persistEmbed(data.media);
      const importedItems = Array.isArray(data.items) ? data.items : [];
      setPlaylistItems(importedItems);
      try { localStorage.setItem(playlistCacheKey(widgetId), JSON.stringify(importedItems)); } catch {}
      if (data.name) {
        const next = [{ id: crypto.randomUUID(), name: data.name, media: data.media, items: importedItems, savedAt: new Date().toISOString() }, ...templates].slice(0, 40);
        setTemplates(next);
        try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next)); } catch {}
        window.dispatchEvent(new CustomEvent('wb:templates-updated'));
      }
      setEditing(false);
    } catch { window.alert('Window Brainのメディアテンプレートを読み込めませんでした'); }
  };

  const selectPlaylistItem = (item: PlaylistItem) => {
    const next = parseEmbed(item.link);
    if (next) { persistEmbed({ ...next, list: embed.list }); setShowPlaylist(false); }
  };

  const applyUrl = () => {
    const next = parseEmbed(input);
    if (next) persistEmbed(next);
    setEditing(false);
    setInput('');
  };

  const copyMediaUrl = async () => {
    if (await copyToClipboard(mediaUrl(embed))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
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
      {/* Header overlay — pointer-events:auto so this area acts as a drag handle */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, padding: '6px 38px 6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%)' }}>
        <div className="w-head" style={{ margin: 0, color: '#fff', pointerEvents: 'none' }}>
          <div className="title">
            <span className="glyph" style={{ background: '#ff3355', boxShadow: '0 0 8px #ff3355' }} />
            YOUTUBE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={copyMediaUrl}
            title="動画URLをコピーして共有"
            aria-label="動画URLをコピーして共有"
            style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', border: '.5px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 6, padding: '3px 7px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', cursor: 'pointer', pointerEvents: 'auto' }}
          >{copied ? 'COPIED' : 'COPY'}</button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={startEditing}
            style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', border: '.5px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 6, padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', cursor: 'pointer', pointerEvents: 'auto' }}
          >URL ✎</button>
        </div>
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
              crossOrigin="anonymous"
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
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>YOUTUBE / PLAYLIST / TWITCH URL</div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setEditing(false); }}
            placeholder="YouTube playlist / video or Twitch channel / VOD / clip"
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUrl} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditing(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <select aria-label="保存済みメディアテンプレート" defaultValue="" onChange={(e) => { const selected = templates.find((item) => item.id === e.target.value); if (selected) { persistEmbed(selected.media); setPlaylistItems(selected.items ?? []); try { localStorage.setItem(playlistCacheKey(widgetId), JSON.stringify(selected.items ?? [])); } catch {} } }} style={{ minWidth: 0, flex: 1, background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: 7, color: '#fff', font: 'inherit', fontSize: 11 }}>
              <option value="" style={{ color: '#111' }}>保存済みテンプレート</option>
              {templates.map((item) => <option key={item.id} value={item.id} style={{ color: '#111' }}>{item.name}</option>)}
            </select>
            <button onClick={saveTemplate} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 9px', color: '#fff', cursor: 'pointer', font: 'inherit', fontSize: 10 }}>保存</button>
            <button onClick={() => downloadTemplate(embed, embed.list ? 'Playlist' : 'Media', playlistItems)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 9px', color: '#fff', cursor: 'pointer', font: 'inherit', fontSize: 10 }}>書出</button>
            <button onClick={() => templateInputRef.current?.click()} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 9px', color: '#fff', cursor: 'pointer', font: 'inherit', fontSize: 10 }}>読込</button>
            <input ref={templateInputRef} type="file" accept="application/json,.json" hidden onChange={importTemplate} />
          </div>
        </div>
      )}

      {/* Provider player — each widget stores its source under its own widget id */}
      {active && embed.provider === 'twitch' && <iframe title="Twitch player" src={twitchEmbedUrl(embed)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}
      {active && embed.provider !== 'twitch' && <div ref={containerRef} className="yt-player" style={{ position: 'absolute', inset: 0 }} />}
      {embed.list && !active && !editing && <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowPlaylist((value) => !value)} style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 4, border: '.5px solid rgba(255,255,255,.28)', borderRadius: 6, background: 'rgba(0,0,0,.58)', color: '#fff', padding: '5px 9px', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>{showPlaylist ? 'CLOSE LIST' : 'PLAYLIST' + (playlistItems.length ? ' · ' + playlistItems.length : '')}</button>}
      {showPlaylist && !active && <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: '48px 8px 44px', zIndex: 5, overflow: 'auto', borderRadius: 10, padding: 8, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(10px)' }}>
        {playlistItems.length ? playlistItems.map((item, index) => <button key={item.link + '-' + index} onClick={() => selectPlaylistItem(item)} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '8px 6px', border: 0, borderBottom: '.5px solid rgba(255,255,255,.12)', color: '#fff', background: 'transparent', fontSize: 11, cursor: 'pointer' }}>{item.title}</button>) : <div style={{ padding: 8, color: 'rgba(255,255,255,.62)', fontSize: 11 }}>プレイリストを読み込み中、または取得できません。再生ボタンからリストを開けます。</div>}
      </div>}

      {/* Custom volume control — always visible while player is active */}
      {active && (
        <div
          style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 6, display: 'flex', alignItems: 'center' }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerEnter={syncVol}
        >
          {/* Mute toggle */}
          <button
            onClick={() => {
              try {
                if (volMuted) { playerRef.current?.unMute(); setVolMuted(false); }
                else          { playerRef.current?.mute();   setVolMuted(true);  }
              } catch {}
            }}
            style={{
              width: 30, height: 24, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,.58)', backdropFilter: 'blur(6px)',
              border: '.5px solid rgba(255,255,255,.18)', borderRight: 'none',
              borderRadius: '7px 0 0 7px', color: '#fff', cursor: 'pointer',
            }}
          >
            <VolIcon muted={volMuted} vol={volVal} />
          </button>
          {/* Slider */}
          <div style={{
            background: 'rgba(0,0,0,.58)', backdropFilter: 'blur(6px)',
            border: '.5px solid rgba(255,255,255,.18)',
            borderRadius: '0 7px 7px 0', padding: '0 10px',
            display: 'flex', alignItems: 'center', height: 24, boxSizing: 'border-box',
          }}>
            <input
              type="range" min={0} max={100}
              value={volMuted ? 0 : volVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolVal(v);
                try {
                  playerRef.current?.setVolume(v);
                  if (v === 0 && !volMuted) { playerRef.current?.mute();   setVolMuted(true);  }
                  else if (v > 0 && volMuted) { playerRef.current?.unMute(); setVolMuted(false); }
                } catch {}
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ width: 76, cursor: 'pointer', accentColor: '#fff', margin: 0, display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
