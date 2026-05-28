import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

const TODOS_KEY = 'wb.todos.v1';

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;    // ISO 8601
  completedAt?: string; // ISO 8601、完了時に設定
}

const DEFAULT_TODOS: Todo[] = [
  { id: 1, text: 'デザインシステムの整理', done: false, createdAt: new Date().toISOString() },
  { id: 2, text: 'ウィジェット v2 レビュー', done: false, createdAt: new Date().toISOString() },
  { id: 3, text: 'リサイズの当たり判定検証', done: true, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
  { id: 4, text: '夕方ミーティング', done: false, createdAt: new Date().toISOString() },
];

function migrateItem(raw: Record<string, unknown>): Todo {
  const id = Number(raw.id) || Date.now();
  return {
    id,
    text: String(raw.text ?? ''),
    done: Boolean(raw.done),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(id > 1e12 ? id : Date.now()).toISOString(),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  };
}

function loadTodos(): Todo[] {
  try {
    const p = JSON.parse(localStorage.getItem(TODOS_KEY) ?? 'null');
    if (Array.isArray(p)) return p.map(migrateItem);
  } catch {}
  return DEFAULT_TODOS;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs   = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dayMs === todayMs) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (dayMs === todayMs - 86400000) return '昨日';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function exportTodos(items: Todo[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TodoWidget() {
  const [items, setItems] = useState<Todo[]>(loadTodos);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(TODOS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    const onUpdate = () => setItems(loadTodos());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const toggle = (id: number) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const willBeDone = !i.done;
      return { ...i, done: willBeDone, completedAt: willBeDone ? now : undefined };
    }));
  };

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const startEdit = (item: Todo) => {
    setEditingId(item.id);
    setEditText(item.text);
    setTimeout(() => editInputRef.current?.focus(), 20);
  };

  const saveEdit = () => {
    if (editingId !== null) {
      const text = editText.trim();
      if (text) setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, text } : i));
    }
    setEditingId(null); setEditText('');
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setItems((prev) => [{ id: Date.now(), text: newText.trim(), done: false, createdAt: new Date().toISOString() }, ...prev]);
    setNewText('');
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (Array.isArray(data)) setItems(data.map(migrateItem));
    } catch { alert('読み込みに失敗しました'); }
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="w-body">
      <Head
        title="TASKS"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono muted" style={{ fontSize: 10 }}>{done}/{items.length}</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => exportTodos(items)}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title="エクスポート">↑</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 3px' }} title="インポート">↓</button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImportFile} />
          </div>
        }
      />

      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: 2 }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="todo-row"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}
            >
              {/* Checkbox */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggle(item.id)}
                style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--rule-strong)', background: item.done ? 'var(--accent,#9aa6ff)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', cursor: 'pointer', padding: 0 }}
              >
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M1.5 5L4 7.5L8.5 2" stroke="#0a0d14" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {editingId === item.id ? (
                <>
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ flex: 1, minWidth: 0, background: 'var(--track)', border: '.5px solid var(--accent,#9aa6ff)', borderRadius: 6, padding: '3px 8px', color: 'inherit', font: 'inherit', fontSize: 13, outline: 'none' }}
                  />
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={saveEdit}
                    style={{ background: 'var(--accent,#9aa6ff)', border: 'none', borderRadius: 5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#0a0d14', fontSize: 13, fontWeight: 600 }}>✓</button>
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={cancelEdit}
                    style={{ background: 'var(--chip)', border: 'none', borderRadius: 5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--ink-mute)', fontSize: 13 }}>✕</button>
                </>
              ) : (
                <>
                  <span
                    onClick={() => !item.done && startEdit(item)}
                    style={{ flex: 1, minWidth: 0, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? .4 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: item.done ? 'default' : 'pointer' }}
                  >
                    {item.text}
                  </span>
                  {/* 日時 */}
                  <span className="mono muted" style={{ fontSize: 9, letterSpacing: '.04em', flexShrink: 0, opacity: .5 }}>
                    {item.done && item.completedAt ? `✓ ${fmtDate(item.completedAt)}` : fmtDate(item.createdAt)}
                  </span>
                  {/* アクション */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {!item.done && (
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => startEdit(item)}
                        className="todo-action"
                        style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 12, borderRadius: 4, lineHeight: 1 }}>✎</button>
                    )}
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(item.id)}
                      className="todo-action"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, borderRadius: 4, lineHeight: 1 }}>×</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, marginTop: 4 }}>
          <button type="submit" style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-mute)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0 }}>+</button>
          <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="新しいタスクを追加"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }} />
        </form>
      </div>
    </div>
  );
}
