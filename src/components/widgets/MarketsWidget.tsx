import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

interface CoinData {
  sym: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: number[];
}

const COIN_IDS = 'bitcoin,ethereum,solana';
const SYM_MAP: Record<string, string> = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };
const CACHE_KEY = 'wb.markets.cache';
const CACHE_TTL = 60 * 1000;

function readCache(): CoinData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: CoinData[]; ts: number };
    return Date.now() - ts < CACHE_TTL ? data : null;
  } catch { return null; }
}

async function fetchMarkets(): Promise<CoinData[]> {
  const r = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?` +
    `vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc` +
    `&sparkline=true&price_change_percentage=24h`
  );
  const list = await r.json() as Array<{
    id: string; name: string; current_price: number;
    price_change_percentage_24h_in_currency: number;
    sparkline_in_7d: { price: number[] };
  }>;
  const data: CoinData[] = list.map((c) => ({
    sym: SYM_MAP[c.id] ?? c.id.toUpperCase(),
    name: c.name,
    price: c.current_price,
    change24h: c.price_change_percentage_24h_in_currency,
    sparkline: c.sparkline_in_7d.price.slice(-24),
  }));
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
  return data;
}

function Sparkline({ points, w, h }: { points: number[]; w: number; h: number }) {
  if (points.length < 2) return null;
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

export function MarketsWidget({ size }: { size: Size }) {
  const [coins, setCoins] = useState<CoinData[]>(() => readCache() ?? []);
  const [err, setErr] = useState(false);
  const wide = size.w >= 3;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const cached = readCache();
      if (cached) { if (alive) setCoins(cached); return; }
      try {
        const data = await fetchMarkets();
        if (alive) { setCoins(data); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    load();
    const id = setInterval(load, 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const rows = coins.slice(0, size.h >= 2 ? 3 : 2);
  const cols = wide
    ? '38px minmax(0,1fr) auto auto'
    : '32px minmax(0,1fr) auto';

  return (
    <div className="w-body">
      <Head title="MARKETS" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mono muted" style={{ fontSize: 10 }}>USD</span>
          {err && <span style={{ fontSize: 9, color: '#ff7a8a', fontFamily: 'var(--font-mono)' }}>OFFLINE</span>}
        </div>
      } />
      <div className="w-content" style={{ gap: size.h >= 2 ? 4 : 6, justifyContent: 'space-around', minWidth: 0 }}>
        {rows.length === 0 ? (
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em' }}>Loading…</div>
        ) : rows.map((c) => (
          <div key={c.sym} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: wide ? 10 : 8, fontSize: 12, minWidth: 0 }}>
            <div className="mono" style={{ fontWeight: 500, letterSpacing: '.04em', fontSize: 11 }}>{c.sym}</div>
            {wide ? (
              <div style={{ opacity: .6, height: 18, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                <Sparkline points={c.sparkline} w={80} h={18} />
              </div>
            ) : (
              <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtPrice(c.price)}</div>
            )}
            {wide && (
              <div className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtPrice(c.price)}</div>
            )}
            <div className="mono" style={{ textAlign: 'right', color: c.change24h >= 0 ? '#5dd6a0' : '#ff7a8a', fontSize: 11, whiteSpace: 'nowrap' }}>
              {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
