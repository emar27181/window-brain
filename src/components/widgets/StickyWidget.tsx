import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.sticky.v1';

interface Sticky {
  id: number;
  text: string;
  createdAt: string;
}

function load(): Sticky[] {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function save(items: Sticky[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function StickyNote({ sticky, onSave, onRemove }: {
  sticky: Sticky;
  onSave: (id: number, text: string) => void;
  onRemove: (id: number) => void;
}) {
  const [editing, setEditing] = useState(sticky.text === '');
  const [text, setText] = useState(sticky.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => ref.current?.focus(), 20);
  }, [editing]);

  const commit = () => {
    onSave(sticky.id, text);
    setEditing(false);
  };

  return (
    <div style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, position: 'relative' }}>
      {editing ? (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'Escape') commit(); }}
          onBlur={commit}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12, resize: 'none', minHeight: 48, width: '100%', lineHeight: 1.5 }}
        />
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setEditing(true)}
          style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 32, cursor: 'text', opacity: text ? 1 : 0.4 }}>
          {text || '(クリックして編集)'}
        </div>
      )}
      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(sticky.id)}
        style={{ position: 'absolute', top: 4, right: 6, background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '1px 4px', opacity: 0.6 }}>×</button>
    </div>
  );
}

export function StickyWidget({ size }: { size: Size }) {
  const [stickies, setStickies] = useState<Sticky[]>(load);

  useEffect(() => { save(stickies); }, [stickies]);

  const add = () => {
    setStickies((prev) => [...prev, { id: Date.now(), text: '', createdAt: new Date().toISOString() }]);
  };

  const handleSave = (id: number, text: string) => {
    setStickies((prev) => prev.map((s) => s.id === id ? { ...s, text } : s));
  };

  const handleRemove = (id: number) => setStickies((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="w-body">
      <Head title="STICKY" right={
        <button onPointerDown={(e) => e.stopPropagation()} onClick={add}
          style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)' }}>+ NEW</button>
      } />
      <div className="w-content" style={{ gap: 6, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
          {stickies.length === 0 ? (
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '.1em', padding: '12px 0', textAlign: 'center', opacity: 0.5 }}>
              「+ NEW」で付箋を追加
            </div>
          ) : stickies.map((s) => (
            <StickyNote key={s.id} sticky={s} onSave={handleSave} onRemove={handleRemove} />
          ))}
        </div>
      </div>
    </div>
  );
}
