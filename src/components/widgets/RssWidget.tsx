import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const URL_KEY = 'wb.rss.v1';
const DEFAULT_URL = 'https://feeds.bbci.co.uk/news/world/rss.xml';
const API_BASE = 'https://api.rss2json.com/v1/api.json';

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
}

function loadUrl(): string {
  try { return localStorage.getItem(URL_KEY) ?? DEFAULT_URL; }
  catch { return DEFAULT_URL; }
}

function saveUrl(url: string) {
  try { localStorage.setItem(URL_KEY, url); } catch {}
}

export function RssWidget({ size }: { size: Size }) {
  const [feedUrl, setFeedUrl] = useState<string>(loadUrl);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const fetchFeed = async (url: string) => {
    setLoading(true); setErr(false);
    try {
      const r = await fetch(`${API_BASE}?rss_url=${encodeURIComponent(url)}&count=10`);
      const data = await r.json() as { items?: RssItem[]; status?: string };
      if (data.status === 'ok' && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setErr(true);
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(feedUrl); }, [feedUrl]);

  const applyUrl = () => {
    const url = urlInput.trim();
    if (!url) { setEditingUrl(false); return; }
    setFeedUrl(url);
    saveUrl(url);
    setEditingUrl(false);
  };

  const startEdit = () => {
    setUrlInput(feedUrl);
    setEditingUrl(true);
  };

  const maxItems = size.h >= 3 ? 10 : size.h >= 2 ? 6 : 4;
  const visible = items.slice(0, maxItems);

  const shortDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url.slice(0, 20); }
  };

  return (
    <div className="w-body">
      <Head title="RSS" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {err && <span style={{ fontSize: 9, color: '#ff7a8a', fontFamily: 'var(--font-mono)' }}>ERROR</span>}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={startEdit}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 3px', letterSpacing: '.08em', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shortDomain(feedUrl)} ✎
          </button>
        </div>
      } />

      {editingUrl && (
        <div onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>RSS FEED URL</div>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setEditingUrl(false); }}
            placeholder={DEFAULT_URL}
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 12, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUrl}
              style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditingUrl(false)}
              style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading && items.length === 0 ? (
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em', padding: '8px 0' }}>Loading…</div>
          ) : visible.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              style={{ display: 'block', padding: '5px 0', borderBottom: '.5px solid var(--rule)', fontSize: 12, color: 'inherit', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85, cursor: 'pointer' }}
              title={item.title}>
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
