import { useState, useEffect, useRef } from 'react';

const KEY_PREFIX = 'wb.widget.githubpet.v1.';
const REFRESH_MS = 10 * 60 * 1000;

interface Cached { username: string; todayCount: number; ts: number }

function cacheKey(id?: string) { return KEY_PREFIX + (id ?? 'default'); }

function loadCached(id?: string): Cached | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    return raw ? JSON.parse(raw) as Cached : null;
  } catch { return null; }
}
function saveCached(d: Cached, id?: string) {
  try { localStorage.setItem(cacheKey(id), JSON.stringify(d)); } catch {}
}

type Mood = 'sleeping' | 'idle' | 'happy' | 'excited';

function getMood(n: number): Mood {
  if (n === 0) return 'sleeping';
  if (n <= 2)  return 'idle';
  if (n <= 6)  return 'happy';
  return 'excited';
}

const MOOD_MSG: Record<Mood, string> = {
  sleeping: 'No commits yet...',
  idle:     'A little quiet today',
  happy:    'Keep it up!',
  excited:  'On fire today!',
};

async function fetchTodayCount(username: string): Promise<number> {
  const res = await fetch(
    `https://api.github.com/users/${username}/events/public?per_page=100`
  );
  if (!res.ok) throw new Error(res.status === 404 ? 'User not found' : 'API error');
  const events = await res.json() as Array<{ type: string; created_at: string }>;
  const today = new Date().toISOString().slice(0, 10);
  const TYPES = new Set(['PushEvent','PullRequestEvent','IssuesEvent','PullRequestReviewEvent','CreateEvent']);
  return events.filter(e => e.created_at.slice(0, 10) === today && TYPES.has(e.type)).length;
}

// Inject keyframes once
let injected = false;
function injectStyles() {
  if (injected || document.getElementById('ghpet-styles')) { injected = true; return; }
  injected = true;
  const s = document.createElement('style');
  s.id = 'ghpet-styles';
  s.textContent = `
    @keyframes petBounce { from { transform: translateY(0); } to { transform: translateY(-7px); } }
    @keyframes petFloat  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes petZzz    { 0% { opacity:.8; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-12px) scale(.7); } }
    @keyframes petSpark  { 0%,100% { opacity:.9; transform:scale(1) rotate(0deg); } 50% { opacity:.4; transform:scale(.7) rotate(15deg); } }
  `;
  document.head.appendChild(s);
}

function Pet({ mood }: { mood: Mood }) {
  useEffect(() => { injectStyles(); }, []);

  const bodyAnim = mood === 'excited' ? 'petBounce .35s ease-in-out infinite alternate' :
                   mood === 'happy'   ? 'petBounce .75s ease-in-out infinite alternate' :
                   mood === 'sleeping'? 'petFloat 3s ease-in-out infinite' : 'none';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg style={{ display: 'block', animation: bodyAnim }} width="100" height="90" viewBox="0 0 100 90">
        {/* Shadow */}
        <ellipse cx="50" cy="83" rx="25" ry="5" fill="rgba(0,0,0,.14)" />
        {/* Body */}
        <ellipse cx="50" cy="52" rx="36" ry="28" fill="var(--accent)" opacity=".88" />
        {/* Sheen */}
        <ellipse cx="40" cy="40" rx="10" ry="7" fill="rgba(255,255,255,.22)" />

        {/* Eyes */}
        {mood === 'sleeping' && <>
          <path d="M33 49 Q39 44 45 49" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M55 49 Q61 44 67 49" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </>}
        {mood === 'idle' && <>
          <circle cx="39" cy="48" r="4.5" fill="white"/>
          <circle cx="61" cy="48" r="4.5" fill="white"/>
          <circle cx="40" cy="49" r="2" fill="var(--accent)"/>
          <circle cx="62" cy="49" r="2" fill="var(--accent)"/>
        </>}
        {mood === 'happy' && <>
          <path d="M31 52 Q39 44 47 52" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M53 52 Q61 44 69 52" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </>}
        {mood === 'excited' && <>
          <circle cx="39" cy="47" r="5.5" fill="white"/>
          <circle cx="61" cy="47" r="5.5" fill="white"/>
          <circle cx="37.5" cy="45.5" r="2.8" fill="var(--accent)"/>
          <circle cx="59.5" cy="45.5" r="2.8" fill="var(--accent)"/>
          <circle cx="35.5" cy="43.5" r="1.2" fill="white"/>
          <circle cx="57.5" cy="43.5" r="1.2" fill="white"/>
        </>}

        {/* Mouth */}
        {(mood === 'happy' || mood === 'excited') && (
          <path d="M41 62 Q50 70 59 62" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        )}
        {mood === 'idle' && (
          <line x1="44" y1="61" x2="56" y2="61" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
        )}
      </svg>

      {/* ZZZ */}
      {mood === 'sleeping' && (
        <div style={{ position: 'absolute', top: -2, right: -6, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          {[{s:'z',sz:9,d:0},{s:'z',sz:11,d:.45},{s:'Z',sz:14,d:.9}].map(({s,sz,d},i) => (
            <span key={i} style={{ fontFamily:'var(--font-mono)', fontSize:sz, color:'var(--accent)', display:'block', animation:`petZzz 2s ease-in-out ${d}s infinite` }}>{s}</span>
          ))}
        </div>
      )}

      {/* Sparkles */}
      {mood === 'excited' && <>
        <div style={{ position:'absolute', top:6, left:-16, fontSize:11, color:'var(--accent)', animation:'petSpark .9s ease-in-out 0s infinite' }}>✦</div>
        <div style={{ position:'absolute', top:-4, right:-16, fontSize:13, color:'var(--accent)', animation:'petSpark .9s ease-in-out .3s infinite' }}>✧</div>
        <div style={{ position:'absolute', top:28, left:-12, fontSize:8, color:'var(--accent)', animation:'petSpark .9s ease-in-out .6s infinite' }}>✦</div>
      </>}
    </div>
  );
}

export function GithubPetWidget({ widgetId }: { size?: { w: number; h: number }; widgetId?: string }) {
  const initial = loadCached(widgetId);
  const [username, setUsername]     = useState(initial?.username ?? '');
  const [inputVal, setInputVal]     = useState('');
  const [editing, setEditing]       = useState(!initial?.username);
  const [todayCount, setTodayCount] = useState<number | null>(
    initial && Date.now() - initial.ts < REFRESH_MS ? initial.todayCount : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchRef = useRef(0);

  const mood = getMood(todayCount ?? 0);

  const doFetch = async (user: string) => {
    const id = ++fetchRef.current;
    setLoading(true); setError(null);
    try {
      const count = await fetchTodayCount(user);
      if (id !== fetchRef.current) return;
      setTodayCount(count);
      saveCached({ username: user, todayCount: count, ts: Date.now() }, widgetId);
    } catch (e) {
      if (id !== fetchRef.current) return;
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!username) return;
    const c = loadCached(widgetId);
    if (c && c.username === username && Date.now() - c.ts < REFRESH_MS) {
      setTodayCount(c.todayCount); return;
    }
    doFetch(username);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!username) return;
    const timer = setInterval(() => doFetch(username), REFRESH_MS);
    return () => clearInterval(timer);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyUsername = () => {
    const u = inputVal.trim().replace(/^@/, '');
    if (!u) return;
    setUsername(u); setInputVal(''); setEditing(false); setTodayCount(null);
    doFetch(u);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputVal(username);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  if (editing) {
    return (
      <div className="w-body" onPointerDown={(e) => e.stopPropagation()} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:20 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'.18em', opacity:.55 }}>GITHUB USERNAME</div>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyUsername(); if (e.key === 'Escape') { if (username) setEditing(false); } }}
          placeholder="e.g. octocat"
          style={{ width:'100%', background:'rgba(128,128,128,.12)', border:'.5px solid rgba(128,128,128,.3)', borderRadius:8, padding:'9px 12px', color:'inherit', font:'inherit', fontSize:13, outline:'none' }}
        />
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={applyUsername}
            style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 18px', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'.12em', cursor:'pointer', color:'#0a0d14', fontWeight:500 }}
          >SET</button>
          {username && (
            <button
              onClick={() => setEditing(false)}
              style={{ background:'rgba(128,128,128,.15)', border:'.5px solid rgba(128,128,128,.2)', borderRadius:7, padding:'7px 14px', fontFamily:'var(--font-mono)', fontSize:10, cursor:'pointer', color:'inherit' }}
            >CANCEL</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-body" style={{ padding:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, position:'relative' }}>
      {/* Edit button */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={startEditing}
        style={{ position:'absolute', top:10, right:12, background:'transparent', border:'none', color:'var(--ink-faint)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:9, padding:'2px 4px' }}
      >✎</button>

      {loading ? (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, opacity:.4 }}>loading...</div>
      ) : error ? (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#ff6a7a', textAlign:'center', padding:'0 16px' }}>{error}</div>
      ) : (
        <>
          <Pet mood={mood} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, opacity:.5, letterSpacing:'.12em' }}>@{username}</div>
            <div style={{ fontSize:11, marginTop:3, opacity:.75 }}>{MOOD_MSG[mood]}</div>
            {todayCount !== null && (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, marginTop:4, letterSpacing:'.02em' }}>
                <span style={{ color:'var(--accent)' }}>{todayCount}</span>
                <span style={{ fontSize:9, opacity:.5, marginLeft:5 }}>contributions today</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
