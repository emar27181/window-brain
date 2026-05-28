import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Head } from '../Head';

const NOTES_KEY = 'wb.notes.v1';

export interface NotesData {
  content: string;
  updatedAt: string; // ISO 8601
}

const DEFAULT_CONTENT = `窓辺で、思いつくままに。

— アンビエントUIは何かを示すのではなく、その場の空気をつくる。
`;

marked.use({ breaks: true, gfm: true });

function loadNotes(): NotesData {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      // 旧フォーマット: 文字列
      if (typeof parsed === 'string') return { content: parsed, updatedAt: new Date().toISOString() };
      // 新フォーマット: { content, updatedAt }
      if (parsed && typeof parsed.content === 'string') return parsed as NotesData;
    }
  } catch {}
  return { content: DEFAULT_CONTENT, updatedAt: new Date().toISOString() };
}

function fmtUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000)   return '今さっき';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分前`;
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs   = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dayMs === todayMs) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (dayMs === todayMs - 86400000) return '昨日';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function exportNotes(data: NotesData) {
  const blob = new Blob([data.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotesWidget() {
  const [data, setData] = useState<NotesData>(loadNotes);
  const [preview, setPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    const onUpdate = () => setData(loadNotes());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const setContent = (content: string) =>
    setData({ content, updatedAt: new Date().toISOString() });

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setContent(await file.text());
  };

  const html = preview ? String(marked.parse(data.content)) : '';

  return (
    <div className="w-body">
      <Head
        title="NOTES"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 更新日時 */}
            <span className="mono muted" style={{ fontSize: 9, letterSpacing: '.06em' }}>
              {fmtUpdated(data.updatedAt)}
            </span>
            {/* Edit / Preview toggle */}
            <div className="s-seg" style={{ padding: 2, borderRadius: 7 }}>
              <button className={`s-seg-btn${!preview ? ' active' : ''}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setPreview(false)} style={{ padding: '3px 8px', fontSize: 9, borderRadius: 5 }}>EDIT</button>
              <button className={`s-seg-btn${preview ? ' active' : ''}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setPreview(true)} style={{ padding: '3px 8px', fontSize: 9, borderRadius: 5 }}>MD</button>
            </div>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => exportNotes(data)}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title=".md エクスポート">↑</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title=".md インポート">↓</button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,text/*" style={{ display: 'none' }} onChange={onImportFile} />
          </div>
        }
      />

      <div className="w-content">
        {preview ? (
          <div className="md-preview" onPointerDown={(e) => e.stopPropagation()} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <textarea
            value={data.content}
            onChange={(e) => setContent(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            spellCheck={false}
            placeholder="メモを書こう…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'none', padding: 0 }}
          />
        )}
      </div>
    </div>
  );
}
