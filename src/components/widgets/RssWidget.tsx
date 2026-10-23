import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';
import { copyToClipboard } from '../../lib/copyToClipboard';

const LEGACY_URL_KEY = 'wb.rss.v1';
const DEFAULT_URL = 'https://feeds.bbci.co.uk/news/world/rss.xml';
const API_BASE = 'https://api.rss2json.com/v1/api.json';

interface RssItem { title: string; link: string; pubDate: string }
interface WidgetFeedState { url: string; daily: boolean }
let legacyOwner: string | null = null;

function urlKey(widgetId?: string) { return widgetId ? 'wb.rss.v1.' + widgetId : LEGACY_URL_KEY; }
function settingsKey(widgetId?: string) { return widgetId ? 'wb.rss.settings.v1.' + widgetId : 'wb.rss.settings.v1'; }
function localDateKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}
function dailySelectionKey(widgetId: string | undefined, date: string) {
  return 'wb.rss.daily.v1.' + (widgetId ?? 'default') + '.' + date;
}

function loadState(widgetId?: string): WidgetFeedState {
  try {
    const raw = localStorage.getItem(settingsKey(widgetId));
    if (raw) return { url: DEFAULT_URL, daily: false, ...JSON.parse(raw) as Partial<WidgetFeedState> };
    const stored = localStorage.getItem(urlKey(widgetId));
    if (stored) return { url: stored, daily: false };
    const legacy = localStorage.getItem(LEGACY_URL_KEY);
    if (widgetId && !legacyOwner && legacy) {
      legacyOwner = widgetId;
      localStorage.setItem(urlKey(widgetId), legacy);
      localStorage.removeItem(LEGACY_URL_KEY);
      return { url: legacy, daily: false };
    }
    return { url: legacyOwner === widgetId ? (legacy ?? DEFAULT_URL) : DEFAULT_URL, daily: false };
  } catch { return { url: DEFAULT_URL, daily: false }; }
}

function dayHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function RssWidget({ size, widgetId }: { size: Size; widgetId?: string }) {
  const [feedUrl, setFeedUrl] = useState(() => loadState(widgetId).url);
  const [daily, setDaily] = useState(() => loadState(widgetId).daily);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const dateKey = localDateKey();
  const [dailyLink, setDailyLink] = useState(() => {
    try { return localStorage.getItem(dailySelectionKey(widgetId, dateKey)) ?? ''; } catch { return ''; }
  });

  const persist = (url: string, dailyMode: boolean) => {
    try {
      localStorage.setItem(urlKey(widgetId), url);
      localStorage.setItem(settingsKey(widgetId), JSON.stringify({ url, daily: dailyMode }));
    } catch {}
  };

  const fetchFeed = async (url: string) => {
    setLoading(true); setErr(false);
    try {
      const r = await fetch(API_BASE + '?rss_url=' + encodeURIComponent(url) + '&count=20');
      const data = await r.json() as { items?: RssItem[]; status?: string };
      if (!r.ok || data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('feed unavailable');
      setItems(data.items.filter((item) => item.title && item.link));
    } catch { setErr(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeed(feedUrl); }, [feedUrl]);

  useEffect(() => {
    if (!daily || !items.length) return;
    const key = dailySelectionKey(widgetId, dateKey);
    const existing = items.find((item) => item.link === dailyLink);
    if (existing) return;
    let saved = '';
    try { saved = localStorage.getItem(key) ?? ''; } catch {}
    const retained = items.find((item) => item.link === saved);
    const chosen = retained ?? items[dayHash(dateKey + '|' + feedUrl) % items.length];
    setDailyLink(chosen.link);
    try { localStorage.setItem(key, chosen.link); } catch {}
  }, [daily, items, dailyLink, feedUrl, widgetId, dateKey]);

  useEffect(() => {
    const onUpdate = () => {
      const next = loadState(widgetId);
      setFeedUrl(next.url);
      setDaily(next.daily);
    };
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, [widgetId]);

  const applyUrl = () => {
    const url = urlInput.trim();
    if (!url) { setEditingUrl(false); return; }
    setFeedUrl(url);
    persist(url, daily);
    setEditingUrl(false);
  };

  const copyFeedUrl = async () => {
    if (await copyToClipboard(feedUrl)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  const selectedIndex = items.length ? Math.max(0, items.findIndex((item) => item.link === dailyLink)) : -1;
  const dailyItem = selectedIndex >= 0 ? items[selectedIndex] : null;
  const visible = daily ? items.filter((_, index) => index !== selectedIndex).slice(0, size.h >= 3 ? 8 : 4) : items.slice(0, size.h >= 3 ? 12 : size.h >= 2 ? 7 : 4);
  const shortDomain = (url: string) => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url.slice(0, 20); } };
  const linkStyle: React.CSSProperties = { display: 'block', padding: '5px 0', borderBottom: '0.5px solid var(--rule)', fontSize: 12, color: 'inherit', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85, cursor: 'pointer' };

  return (
    <div className="w-body">
      <Head title={daily ? 'NEWS · DAILY' : 'RSS'} right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 24, minWidth: 0 }}>
          {err && <span style={{ fontSize: 9, color: '#ff7a8a', fontFamily: 'var(--font-mono)' }}>ERROR</span>}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { const next = !daily; setDaily(next); persist(feedUrl, next); }}
            title="日付ごとに同じニュースを選びます"
            style={{ background: daily ? 'var(--chip)' : 'transparent', border: 0, color: daily ? 'var(--accent)' : 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 4px' }}>
            {daily ? 'TODAY ✓' : 'DAILY'}
          </button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { setUrlInput(feedUrl); setEditingUrl(true); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 3px', letterSpacing: '.08em', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shortDomain(feedUrl)} ✎
          </button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={copyFeedUrl} title="RSS URLをコピーして共有" aria-label="RSS URLをコピーして共有"
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 3px', flexShrink: 0 }}>
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      } />

      {editingUrl && (
        <div onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>NEWS / RSS FEED URL</div>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setEditingUrl(false); }}
            placeholder={DEFAULT_URL}
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 12, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUrl} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditingUrl(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {daily && dailyItem && <a href={dailyItem.link} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} style={{ ...linkStyle, whiteSpace: 'normal', opacity: 1, color: 'var(--accent)', fontWeight: 500 }}>
            <span className="mono muted" style={{ display: 'block', fontSize: 9, marginBottom: 3 }}>DAILY PICK · {new Date().toLocaleDateString('ja-JP')}</span>{dailyItem.title}
          </a>}
          {loading && items.length === 0 ? <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em', padding: '8px 0' }}>Loading…</div>
            : visible.map((item, i) => <a key={item.link + i} href={item.link} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} style={linkStyle} title={item.title}>{item.title}</a>)}
          {err && <button onClick={() => fetchFeed(feedUrl)} style={{ marginTop: 8, background: 'transparent', color: 'var(--ink-mute)', border: '1px solid var(--rule)', borderRadius: 6, padding: 6, cursor: 'pointer' }}>フィードを再読み込み</button>}
        </div>
      </div>
    </div>
  );
}
