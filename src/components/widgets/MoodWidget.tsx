import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.mood.v1';
const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const COLORS = ['#ff7a8a', '#ffaa7a', '#c8c8c8', '#7adcaa', '#5dd6a0'];

function toDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function load(): Record<string, number> {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (p && typeof p === 'object') return p;
  } catch {}
  return {};
}

function save(data: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function MoodWidget({ size }: { size: Size }) {
  const [moods, setMoods] = useState<Record<string, number>>(load);
  const today = toDateKey();
  const todayScore = moods[today];
  const hasTodayScore = todayScore !== undefined;

  useEffect(() => { save(moods); }, [moods]);

  const record = (score: number) => {
    setMoods((prev) => ({ ...prev, [today]: score }));
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const key = toDateKey(6 - i);
    return { key, score: moods[key] };
  });

  return (
    <div className="w-body">
      <Head title="MOOD" right={
        hasTodayScore && (
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => record(todayScore)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 3px', letterSpacing: '.1em' }}>
            {EMOJIS[todayScore]} 変更
          </button>
        )
      } />
      <div className="w-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
        {!hasTodayScore ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.12em' }}>今日の気分は?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {EMOJIS.map((emoji, i) => (
                <button key={i} onPointerDown={(e) => e.stopPropagation()} onClick={() => record(i)}
                  style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 10, width: 40, height: 40, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                  title={['最悪', '悪い', '普通', '良い', '最高'][i]}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
            <div style={{ fontSize: size.h >= 2 ? 36 : 24 }}>{EMOJIS[todayScore]}</div>
            {size.h >= 2 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
                {days.map(({ key, score }) => (
                  <div key={key} title={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 10, height: score !== undefined ? 6 + score * 6 : 4,
                      borderRadius: 3, background: score !== undefined ? COLORS[score] : 'var(--rule)',
                      opacity: score !== undefined ? 0.85 : 0.3, transition: 'height .3s'
                    }} />
                    <div className="mono" style={{ fontSize: 7, opacity: 0.4 }}>
                      {key === today ? '今日' : new Date(key).getDate() + ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasTodayScore && size.h < 2 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {EMOJIS.map((emoji, i) => (
              <button key={i} onPointerDown={(e) => e.stopPropagation()} onClick={() => record(i)}
                style={{ background: i === todayScore ? 'var(--chip)' : 'transparent', border: '.5px solid var(--rule)', borderRadius: 6, width: 28, height: 28, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
