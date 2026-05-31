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
interface Location { lat: number; lon: number; name: string }

const LOC_KEY = 'wb.weather.location.v1';
const DEFAULT_LOC: Location = { lat: 35.6762, lon: 139.6503, name: 'TOKYO' };

function loadLocation(): Location {
  try {
    const s = JSON.parse(localStorage.getItem(LOC_KEY) ?? 'null');
    if (s?.lat && s?.lon && s?.name) return s;
  } catch {}
  return DEFAULT_LOC;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m` +
    `&daily=temperature_2m_max,temperature_2m_min` +
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
    .filter(({ time }) => time >= now)
    .slice(0, 5)
    .map(({ time, temp }, i) => ({ label: i === 0 ? 'NOW' : String(time.getHours()), temp }));
  return {
    temp: Math.round(c.temperature_2m),
    apparent: Math.round(c.apparent_temperature),
    code: c.weather_code,
    wind: Math.round(c.wind_speed_10m),
    high: Math.round(d.daily.temperature_2m_max[0]),
    low: Math.round(d.daily.temperature_2m_min[0]),
    hourly,
  };
}

async function geocode(query: string): Promise<Location | null> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
  const d = await r.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> };
  const res = d.results?.[0];
  if (!res) return null;
  return { lat: res.latitude, lon: res.longitude, name: res.name.toUpperCase() };
}

export function WeatherWidget({ size }: { size: Size }) {
  const [location, setLocation] = useState<Location>(loadLocation);
  const [data, setData] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [geoErr, setGeoErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const big = size.w >= 2 && size.h >= 2;

  useEffect(() => {
    let alive = true;
    setErr(false);
    const load = async () => {
      try {
        const w = await fetchWeather(location.lat, location.lon);
        if (alive) { setData(w); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [location]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing]);

  const startEdit = () => { setEditing(true); setInput(''); setGeoErr(false); };
  const cancelEdit = () => { setEditing(false); setInput(''); setGeoErr(false); };

  const applyLocation = async () => {
    const q = input.trim();
    if (!q) { cancelEdit(); return; }
    const loc = await geocode(q);
    if (loc) {
      setLocation(loc);
      try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch {}
      cancelEdit();
    } else {
      setGeoErr(true);
    }
  };

  const locSlot = editing ? (
    <form
      onSubmit={(e) => { e.preventDefault(); applyLocation(); }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
    >
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => { setInput(e.target.value); setGeoErr(false); }}
        onBlur={cancelEdit}
        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="都市名…"
        style={{
          width: 72, background: 'var(--track)', border: `.5px solid ${geoErr ? '#ff6a7a' : 'var(--accent,#9aa6ff)'}`,
          borderRadius: 5, padding: '2px 6px', color: 'inherit',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em',
          outline: 'none', textTransform: 'uppercase',
        }}
      />
    </form>
  ) : (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={startEdit}
      title="場所を変更"
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)', padding: '1px 3px', borderRadius: 4 }}
    >
      {location.name}
    </button>
  );

  return (
    <div className="w-body">
      <Head title="WEATHER" right={locSlot} />
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
