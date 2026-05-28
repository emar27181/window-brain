import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

// ─── Types ────────────────────────────────────────────────────────

interface MarketRow {
  sym: string;
  price: number | null;
  change24h: number | null;
  sparkline: number[];
  kind: 'crypto' | 'stock';
}

// ─── Crypto (CoinGecko) ───────────────────────────────────────────

const COIN_IDS = 'bitcoin,ethereum,solana';
const SYM_MAP: Record<string, string> = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };
const CRYPTO_CACHE_KEY = 'wb.markets.crypto.v1';
const CACHE_TTL = 60_000;

function readCryptoCache(): MarketRow[] | null {
  try {
    const { data, ts } = JSON.parse(localStorage.getItem(CRYPTO_CACHE_KEY) ?? '{}') as { data?: MarketRow[]; ts?: number };
    if (data && ts && Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

async function fetchCrypto(): Promise<MarketRow[]> {
  const r = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?` +
    `vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
  );
  const list = await r.json() as Array<{
    id: string; name: string; current_price: number;
    price_change_percentage_24h_in_currency: number;
    sparkline_in_7d: { price: number[] };
  }>;
  const data: MarketRow[] = list.map((c) => ({
    sym: SYM_MAP[c.id] ?? c.id.toUpperCase(),
    price: c.current_price,
    change24h: c.price_change_percentage_24h_in_currency,
    sparkline: c.sparkline_in_7d.price.slice(-24),
    kind: 'crypto',
  }));
  try { localStorage.setItem(CRYPTO_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
  return data;
}

// ─── Stocks (Yahoo Finance) ───────────────────────────────────────

const STOCK_SYMS_KEY = 'wb.markets.stocks.v1';
const DEFAULT_STOCKS = ['NVDA', 'AAPL'];

function loadStockSymbols(): string[] {
  try { return JSON.parse(localStorage.getItem(STOCK_SYMS_KEY) ?? 'null') ?? DEFAULT_STOCKS; }
  catch { return DEFAULT_STOCKS; }
}

async function fetchStock(sym: string): Promise<MarketRow> {
  const r = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?range=1d&interval=60m&includePrePost=false`
  );
  if (!r.ok) return { sym, price: null, change24h: null, sparkline: [], kind: 'stock' };
  const d = await r.json() as {
    chart: {
      result?: Array<{
        meta: { regularMarketPrice: number; chartPreviousClose: number };
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }>;
    };
  };
  const res = d.chart.result?.[0];
  if (!res) return { sym, price: null, change24h: null, sparkline: [], kind: 'stock' };
  const price = res.meta.regularMarketPrice;
  const prev = res.meta.chartPreviousClose;
  const change24h = prev ? ((price - prev) / prev) * 100 : 0;
  const closes = res.indicators.quote[0].close.filter((c): c is number => c !== null);
  return { sym, price, change24h, sparkline: closes, kind: 'stock' };
}

// ─── Sparkline ────────────────────────────────────────────────────

function Sparkline({ points, w, h }: { points: number[]; w: number; h: number }) {
  if (points.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Widget ───────────────────────────────────────────────────────

export function MarketsWidget({ size }: { size: Size }) {
  const [crypto, setCrypto] = useState<MarketRow[]>(() => readCryptoCache() ?? []);
  const [stocks, setStocks] = useState<MarketRow[]>([]);
  const [stockSyms, setStockSyms] = useState<string[]>(loadStockSymbols);
  const [editingStocks, setEditingStocks] = useState(false);
  const [symInput, setSymInput] = useState('');
  const [err, setErr] = useState(false);
  const symInputRef = useRef<HTMLInputElement>(null);
  const wide = size.w >= 3;

  // Fetch crypto
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const cached = readCryptoCache();
      if (cached) { if (alive) setCrypto(cached); return; }
      try {
        const data = await fetchCrypto();
        if (alive) { setCrypto(data); setErr(false); }
      } catch { if (alive) setErr(true); }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Fetch stocks
  useEffect(() => {
    if (stockSyms.length === 0) { setStocks([]); return; }
    let alive = true;
    const load = async () => {
      const rows = await Promise.all(stockSyms.map(fetchStock));
      if (alive) setStocks(rows);
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [stockSyms]);

  const applyStockSyms = () => {
    const syms = symInput.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    setStockSyms(syms);
    try { localStorage.setItem(STOCK_SYMS_KEY, JSON.stringify(syms)); } catch {}
    setEditingStocks(false);
  };

  const startEditStocks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSymInput(stockSyms.join(', '));
    setEditingStocks(true);
    setTimeout(() => symInputRef.current?.focus(), 30);
  };

  const allRows = [...crypto, ...stocks].slice(0, size.h >= 2 ? 5 : 2);
  const cols = wide ? '36px minmax(0,1fr) auto auto' : '32px minmax(0,1fr) auto';

  return (
    <div className="w-body">
      <Head
        title="MARKETS"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono muted" style={{ fontSize: 10 }}>USD</span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={startEditStocks}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', padding: '1px 3px' }}
            >
              STOCKS ✎
            </button>
            {err && <span style={{ fontSize: 9, color: '#ff7a8a', fontFamily: 'var(--font-mono)' }}>OFFLINE</span>}
          </div>
        }
      />

      {/* Stock symbol editor */}
      {editingStocks && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 18 }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.55)' }}>STOCK SYMBOLS (カンマ区切り)</div>
          <input
            ref={symInputRef}
            value={symInput}
            onChange={(e) => setSymInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyStockSyms(); if (e.key === 'Escape') setEditingStocks(false); }}
            placeholder="NVDA, AAPL, TSLA"
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '9px 12px', color: '#fff', font: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyStockSyms} style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: '#0a0d14', fontWeight: 500 }}>SET</button>
            <button onClick={() => setEditingStocks(false)} style={{ background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="w-content" style={{ gap: size.h >= 2 ? 4 : 6, justifyContent: 'space-around', minWidth: 0 }}>
        {allRows.length === 0 ? (
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em' }}>Loading…</div>
        ) : allRows.map((row) => (
          <div key={row.sym} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: wide ? 10 : 8, fontSize: 12, minWidth: 0 }}>
            <div className="mono" style={{ fontWeight: 500, letterSpacing: '.04em', fontSize: 11 }}>
              {row.sym}
              {row.kind === 'stock' && <span style={{ fontSize: 8, opacity: .5, marginLeft: 2 }}>▪</span>}
            </div>
            {wide ? (
              <div style={{ opacity: .6, height: 18, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                <Sparkline points={row.sparkline} w={80} h={18} />
              </div>
            ) : (
              <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 11 }}>
                {row.price != null ? fmtPrice(row.price) : '—'}
              </div>
            )}
            {wide && (
              <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 11 }}>
                {row.price != null ? fmtPrice(row.price) : '—'}
              </div>
            )}
            <div className="mono" style={{ textAlign: 'right', color: (row.change24h ?? 0) >= 0 ? '#5dd6a0' : '#ff7a8a', fontSize: 11, whiteSpace: 'nowrap' }}>
              {row.change24h != null ? `${row.change24h >= 0 ? '+' : ''}${row.change24h.toFixed(2)}%` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
