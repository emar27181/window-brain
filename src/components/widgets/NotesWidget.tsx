import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Head } from '../Head';

const NOTES_KEY = 'wb.notes.v1';
const DEFAULT_NOTES = `# 窓辺で

思いつくままに。

**bold**, *italic*, \`code\`

- リスト項目
- 別の項目

> アンビエントUIは何かを示すのではなく、その場の空気をつくる。
`;

marked.use({ breaks: true, gfm: true });

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
  a.download = `notes-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotesWidget() {
  const [v, setV] = useState<string>(loadNotes);
  const [preview, setPreview] = useState(false);
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
    setV(await file.text());
  };

  const html = preview ? String(marked.parse(v)) : '';

  return (
    <div className="w-body">
      <Head
        title="NOTES"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Edit / Preview toggle */}
            <div className="s-seg" style={{ padding: 2, borderRadius: 7 }}>
              <button
                className={`s-seg-btn${!preview ? ' active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPreview(false)}
                style={{ padding: '3px 8px', fontSize: 9, borderRadius: 5 }}
              >
                EDIT
              </button>
              <button
                className={`s-seg-btn${preview ? ' active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPreview(true)}
                style={{ padding: '3px 8px', fontSize: 9, borderRadius: 5 }}
              >
                MD
              </button>
            </div>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => exportNotes(v)}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title=".md エクスポート">↑</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title=".md インポート">↓</button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,text/*" style={{ display: 'none' }} onChange={onImportFile} />
          </div>
        }
      />

      <div className="w-content">
        {preview ? (
          <div
            className="md-preview"
            onPointerDown={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <textarea
            value={v}
            onChange={(e) => setV(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            spellCheck={false}
            placeholder="# メモを書こう&#10;&#10;**bold**, *italic*, `code` が使えます"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'none', padding: 0 }}
          />
        )}
      </div>
    </div>
  );
}
