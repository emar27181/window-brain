import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.forex.v1';
const API_URL = 'https://open.er-api.com/v6/latest/JPY';
const CACHE_TTL = 30 * 60 * 1000;

const PAIRS: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
  { code: 'CNY', label: 'CNY' },
  { code: 'KRW', label: 'KRW' },
];

interface CacheData {
  rates: Record<string, number>;
  ts: number;
}

function loadCache(): CacheData | null {
  try {
    const p: CacheData = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (p && p.rates && Date.now() - p.ts < CACHE_TTL) return p;
  } catch {}
  return null;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

// rates はJPYベースなので rates[USD] = 1/153 ≈ 0.00653
// 1 USD = ? JPY → 1 / rates[USD]
function jpyPer(rates: Record<string, number>, code: string): number | null {
  const r = rates[code];
  if (!r || r === 0) return null;
  return 1 / r;
}

function fmtJpy(v: number): string {
  if (v < 1) return v.toFixed(4);
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

export function ForexWidget({ size }: { size: Size }) {
  const [rates, setRates] = useState<Record<string, number> | null>(() => loadCache()?.rates ?? null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => loadCache()?.ts ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const r = await fetch(API_URL);
      const data = await r.json() as { rates: Record<string, number> };
      const ts = Date.now();
      setRates(data.rates);
      setUpdatedAt(ts);
      setErr(false);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates: data.rates, ts })); } catch {}
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadCache()) { fetchRates(); }
    const id = setInterval(fetchRates, CACHE_TTL);
    return () => clearInterval(id);
  }, []);

  const displayPairs = size.h >= 2 ? PAIRS : PAIRS.slice(0, 3);

  return (
    <div className="w-body">
      <Head title="FOREX" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {err && <span style={{ fontSize: 9, color: '#ff7a8a', fontFamily: 'var(--font-mono)' }}>OFFLINE</span>}
          {updatedAt && !err && (
            <span className="mono muted" style={{ fontSize: 9, opacity: 0.5 }}>{fmtTime(updatedAt)}</span>
          )}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={fetchRates}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 3px', letterSpacing: '.1em' }}>
            {loading ? '...' : 'UPDATE'}
          </button>
        </div>
      } />
      <div className="w-content" style={{ justifyContent: 'space-around' }}>
        {!rates ? (
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em' }}>Loading…</div>
        ) : displayPairs.map(({ code, label }) => {
          const jpy = jpyPer(rates, code);
          return (
            <div key={code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '3px 0', borderBottom: '.5px solid var(--rule)' }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.06em', color: 'var(--ink-mute)' }}>{label}</span>
              <span className="mono" style={{ fontSize: size.w >= 3 ? 13 : 11 }}>
                {jpy !== null ? `¥${fmtJpy(jpy)}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
