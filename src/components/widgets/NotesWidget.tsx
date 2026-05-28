import { useState, useEffect } from 'react';
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

export function NotesWidget() {
  const [v, setV] = useState<string>(loadNotes);

  useEffect(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(v)); } catch {}
  }, [v]);

  useEffect(() => {
    const onUpdate = () => setV(loadNotes());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  return (
    <div className="w-body">
      <Head title="NOTES" editable right={<span className="mono muted" style={{ fontSize: 10 }}>{v.length} chars</span>} />
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
