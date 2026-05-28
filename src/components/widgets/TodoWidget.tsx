import { useState, useEffect, useRef } from 'react';
import { Head } from '../Head';

const TODOS_KEY = 'wb.todos.v1';

interface Todo { id: number; text: string; done: boolean }

const DEFAULT_TODOS: Todo[] = [
  { id: 1, text: 'デザインシステムの整理', done: false },
  { id: 2, text: 'ウィジェット v2 レビュー', done: false },
  { id: 3, text: 'リサイズの当たり判定検証', done: true },
  { id: 4, text: '夕方ミーティング', done: false },
  { id: 5, text: 'CI のテンプレ修正', done: false },
];

function loadTodos(): Todo[] {
  try {
    const p = JSON.parse(localStorage.getItem(TODOS_KEY) ?? 'null');
    if (Array.isArray(p)) return p as Todo[];
  } catch {}
  return DEFAULT_TODOS;
}

function exportTodos(items: Todo[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
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
  const newInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(TODOS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    const onUpdate = () => setItems(loadTodos());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const toggle = (id: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const remove = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

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
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setItems((prev) => [{ id: Date.now(), text: newText.trim(), done: false }, ...prev]);
    setNewText('');
    newInputRef.current?.focus();
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Todo[];
      if (Array.isArray(data)) setItems(data);
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

              {/* Text or edit input */}
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
                  {/* Action buttons — always visible, not hover-only */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!item.done && (
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => startEdit(item)}
                        className="todo-action"
                        style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 12, borderRadius: 4, lineHeight: 1 }}
                        title="編集">✎</button>
                    )}
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(item.id)}
                      className="todo-action"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, borderRadius: 4, lineHeight: 1 }}
                      title="削除">×</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* New task input */}
        <form
          onSubmit={add}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, marginTop: 4 }}
        >
          <button type="submit" style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-mute)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0 }}>+</button>
          <input
            ref={newInputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="新しいタスクを追加"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }}
          />
        </form>
      </div>
    </div>
  );
}
