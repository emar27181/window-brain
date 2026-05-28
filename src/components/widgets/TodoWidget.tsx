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
  a.download = `tasks-${new Date().toISOString().slice(0,10)}.json`;
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

  const toggle = (id: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const remove = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setItems((prev) => [{ id: Date.now(), text: newText.trim(), done: false }, ...prev]);
    setNewText('');
  };

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
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 2px' }} title="JSON エクスポート">↑</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', padding: '1px 2px' }} title="JSON インポート">↓</button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onImportFile} />
          </div>
        }
      />
      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 2 }}>
          {items.map((item) => (
            <div key={item.id} className="todo-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, position: 'relative', flexShrink: 0 }}>
              <div onClick={() => toggle(item.id)} style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid var(--rule-strong)', background: item.done ? 'var(--accent,#9aa6ff)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', cursor: 'pointer' }}>
                {item.done && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7L8 1.5" stroke="#0a0d14" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
              </div>

              {editingId === item.id ? (
                <input
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                  onBlur={saveEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ flex: 1, minWidth: 0, background: 'var(--track)', border: '.5px solid var(--rule-strong)', borderRadius: 5, padding: '1px 6px', color: 'inherit', font: 'inherit', fontSize: 13, outline: 'none' }}
                />
              ) : (
                <span
                  onDoubleClick={() => !item.done && startEdit(item)}
                  title={item.done ? '' : 'ダブルクリックで編集'}
                  style={{ flex: 1, minWidth: 0, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? .4 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: item.done ? 'default' : 'text' }}
                >
                  {item.text}
                </span>
              )}

              {editingId !== item.id && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {!item.done && (
                    <button className="todo-del" onPointerDown={(e) => e.stopPropagation()} onClick={() => startEdit(item)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '1px 3px', fontSize: 11, opacity: 0, transition: 'opacity .15s', lineHeight: 1 }}>✎</button>
                  )}
                  <button className="todo-del" onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '1px 4px', fontSize: 14, lineHeight: 1, opacity: 0, transition: 'opacity .15s' }} aria-label="削除">×</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, marginTop: 6, borderTop: '.5px solid var(--rule)' }}>
          <span className="mono muted" style={{ fontSize: 11, opacity: .5 }}>+</span>
          <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="新しいタスク（Enterで追加）" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }} />
        </form>
      </div>
    </div>
  );
}
