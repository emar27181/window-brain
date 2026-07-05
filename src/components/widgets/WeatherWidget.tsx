import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const WMO: Record<number, string> = {
  0: 'Clear sky',   1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy',      48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle',  55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain',        65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow',        75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers',  82: 'Heavy showers',
  95: 'Thunderstorm',  96: 'Thunderstorm', 99: 'Thunderstorm',
};

interface HourlyItem { label: string; temp: number }
interface WeatherData {
  temp: number; apparent: number; code: number; wind: number;
  high: number; low: number; hourly: HourlyItem[];
}
interface Location { lat: number; lon: number; name: string; sub?: string }

const LOC_KEY = 'wb.weather.location.v1';
const DEFAULT_LOC: Location = { lat: 35.6762, lon: 139.6503, name: 'TOKYO', sub: 'Japan' };

const PRESETS: Location[] = [
  { name: 'TOKYO',     sub: 'Japan',     lat: 35.6762,  lon: 139.6503 },
  { name: 'OSAKA',     sub: 'Japan',     lat: 34.6937,  lon: 135.5023 },
  { name: 'SAPPORO',   sub: 'Japan',     lat: 43.0642,  lon: 141.3469 },
  { name: 'FUKUOKA',   sub: 'Japan',     lat: 33.5904,  lon: 130.4017 },
  { name: 'NAGOYA',    sub: 'Japan',     lat: 35.1815,  lon: 136.9066 },
  { name: 'NEW YORK',  sub: 'USA',       lat: 40.7128,  lon: -74.0060 },
  { name: 'LOS ANGELES', sub: 'USA',     lat: 34.0522,  lon: -118.2437 },
  { name: 'LONDON',    sub: 'UK',        lat: 51.5074,  lon: -0.1278  },
  { name: 'PARIS',     sub: 'France',    lat: 48.8566,  lon: 2.3522   },
  { name: 'BERLIN',    sub: 'Germany',   lat: 52.5200,  lon: 13.4050  },
  { name: 'SYDNEY',    sub: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'SINGAPORE', sub: 'Singapore', lat: 1.3521,   lon: 103.8198 },
  { name: 'SEOUL',     sub: 'Korea',     lat: 37.5665,  lon: 126.9780 },
  { name: 'BEIJING',   sub: 'China',     lat: 39.9042,  lon: 116.4074 },
  { name: 'DUBAI',     sub: 'UAE',       lat: 25.2048,  lon: 55.2708  },
];

function loadLocation(): Location {
  try {
    const s = JSON.parse(localStorage.getItem(LOC_KEY) ?? 'null');
    if (s?.lat && s?.lon && s?.name) return s;
  } catch {}
  return DEFAULT_LOC;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=1`
  );
  const d = await r.json() as {
    current: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
    hourly: { time: string[]; temperature_2m: number[] };
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
  };
  const c = d.current;
  const now = new Date();
  const hourly: HourlyItem[] = d.hourly.time
    .map((t, i) => ({ time: new Date(t), temp: Math.round(d.hourly.temperature_2m[i]) }))
    .filter(({ time }) => time >= now).slice(0, 5)
    .map(({ time, temp }, i) => ({ label: i === 0 ? 'NOW' : String(time.getHours()), temp }));
  return {
    temp: Math.round(c.temperature_2m), apparent: Math.round(c.apparent_temperature),
    code: c.weather_code, wind: Math.round(c.wind_speed_10m),
    high: Math.round(d.daily.temperature_2m_max[0]),
    low: Math.round(d.daily.temperature_2m_min[0]), hourly,
  };
}

async function searchCities(query: string): Promise<Location[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
  );
  const d = await r.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string; admin1?: string }> };
  return (d.results ?? []).map((res) => ({
    lat: res.latitude, lon: res.longitude,
    name: res.name.toUpperCase(),
    sub: [res.admin1, res.country].filter(Boolean).join(', '),
  }));
}

export function WeatherWidget({ size }: { size: Size }) {
  const [location, setLocation] = useState<Location>(loadLocation);
  const [data, setData] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const big = size.w >= 2 && size.h >= 2;

  useEffect(() => {
    let alive = true;
    setErr(false);
    const load = async () => {
      try { const w = await fetchWeather(location.lat, location.lon); if (alive) { setData(w); setErr(false); } }
      catch { if (alive) setErr(true); }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [location]);

  // デバウンス検索
  useEffect(() => {
    if (!input.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchCities(input)); } catch { setResults([]); }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
    else { setInput(''); setResults([]); }
  }, [editing]);

  const applyLoc = (loc: Location) => {
    setLocation(loc);
    try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch {}
    setEditing(false);
  };

  const listItems = input.trim() ? results : PRESETS;

  if (editing) {
    return (
      <div className="w-body" style={{ gap: 0 }} onPointerDown={(e) => e.stopPropagation()}>
        {/* 検索バー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: .5 }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
            placeholder="都市名で検索…"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }}
          />
          <button onClick={() => setEditing(false)}
            style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>

        {/* 候補リスト */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', marginTop: 6, gap: 1 }}>
          {searching && (
            <div style={{ fontSize: 11, opacity: .45, padding: '4px 0', fontFamily: 'var(--font-mono)', letterSpacing: '.08em' }}>検索中…</div>
          )}
          {!searching && input.trim() && results.length === 0 && (
            <div style={{ fontSize: 11, opacity: .45, padding: '4px 0', fontFamily: 'var(--font-mono)', letterSpacing: '.08em' }}>見つかりません</div>
          )}
          {!searching && listItems.map((loc, i) => (
            <button key={i} onClick={() => applyLoc(loc)}
              style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '5px 6px', borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background .12s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--chip)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', color: 'inherit', flexShrink: 0 }}>{loc.name}</span>
              {loc.sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', color: 'var(--ink-faint)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.sub}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-body">
      <Head title="WEATHER" right={
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditing(true)} title="場所を変更"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)', padding: '1px 3px', borderRadius: 4 }}>
          {location.name}
        </button>
      } />
      <div className="w-content" style={{ justifyContent: 'space-between', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: big ? 6 : 0, minWidth: 0, flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: big ? 56 : 38, fontWeight: 300, letterSpacing: '-.04em', lineHeight: 1 }}>
            {data ? `${data.temp}°` : '—'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {err ? 'Unavailable' : data ? (WMO[data.code] ?? 'Unknown') : 'Loading…'}
          </div>
        </div>
        {big && data && data.hourly.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', minWidth: 0 }}>
            {data.hourly.map((h, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
                <div className="muted" style={{ letterSpacing: '.08em' }}>{h.label}</div>
                <div style={{ marginTop: 4, opacity: i === 0 ? 1 : .7 }}>{h.temp}°</div>
              </div>
            ))}
          </div>
        )}
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.12em', display: 'flex', gap: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {data ? (
            <>
              <span>H {data.high}°</span>
              <span>L {data.low}°</span>
              {size.w >= 3 && <span>↑ {data.wind} km/h</span>}
            </>
          ) : (
            <span style={{ opacity: .5 }}>{err ? 'Check network' : 'Fetching…'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
