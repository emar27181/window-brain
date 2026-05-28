import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

const NOTES_KEY = 'wb.notes.v1';
const DEFAULT_NOTES = '窓辺で、思いつくままに。\n\n— アンビエントUIは何かを示すのではなく、その場の空気をつくる。';

function loadNotes(): string {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw !== null) return JSON.parse(raw) as string;
  } catch {}
  return DEFAULT_NOTES;
}

function exportNotes(text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotesWidget() {
  const [v, setV] = useState<string>(loadNotes);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(v)); } catch {}
  }, [v]);

  useEffect(() => {
    const onUpdate = () => setV(loadNotes());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setV(text);
  };

  return (
    <div className="w-body">
      <Head
        title="NOTES"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono muted" style={{ fontSize: 10 }}>{v.length} chars</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => exportNotes(v)}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 2px' }} title=".txt エクスポート">↑</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 2px' }} title=".txt インポート">↓</button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,text/*" style={{ display: 'none' }} onChange={onImportFile} />
          </div>
        }
      />
      <div className="w-content">
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          spellCheck={false}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13, lineHeight: 1.55, resize: 'none', padding: 0 }}
        />
      </div>
    </div>
  );
}
