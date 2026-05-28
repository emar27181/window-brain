import { useState, useEffect } from 'react';
import { Head } from '../Head';

const TODOS_KEY = 'wb.todos.v1';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULT_TODOS: Todo[] = [
  { id: 1, text: 'デザインシステムの整理', done: false },
  { id: 2, text: 'ウィジェット v2 レビュー', done: false },
  { id: 3, text: 'リサイズの当たり判定検証', done: true },
  { id: 4, text: '夕方ミーティング', done: false },
  { id: 5, text: 'CI のテンプレ修正', done: false },
];

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODOS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p as Todo[];
    }
  } catch {}
  return DEFAULT_TODOS;
}

export function TodoWidget() {
  const [items, setItems] = useState<Todo[]>(loadTodos);
  const [text, setText] = useState('');

  useEffect(() => {
    try { localStorage.setItem(TODOS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    const onUpdate = () => setItems(loadTodos());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  const toggle = (id: number) => setItems(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: number) => setItems(items.filter((i) => i.id !== id));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setItems([{ id: Date.now(), text: text.trim(), done: false }, ...items]);
    setText('');
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="w-body">
      <Head title="TASKS" editable right={<span className="mono muted" style={{ fontSize: 10 }}>{done}/{items.length}</span>} />
      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 2 }}>
          {items.map((i) => (
            <div key={i.id} className="todo-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 13, position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => toggle(i.id)}
                style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid var(--rule-strong)', background: i.done ? 'var(--accent,#9aa6ff)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', cursor: 'pointer' }}
              >
                {i.done && (
                  <svg width="9" height="9" viewBox="0 0 9 9">
                    <path d="M1 4.5L3.5 7L8 1.5" stroke="#0a0d14" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <span
                onClick={() => toggle(i.id)}
                style={{ flex: 1, minWidth: 0, textDecoration: i.done ? 'line-through' : 'none', opacity: i.done ? .4 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
              >
                {i.text}
              </span>
              <button
                className="todo-del"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => remove(i.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 4px', fontSize: 14, lineHeight: 1, opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, marginTop: 6, borderTop: '.5px solid var(--rule)' }}>
          <span className="mono muted" style={{ fontSize: 11, opacity: .5 }}>+</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="新しいタスク（Enterで追加）"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }}
          />
        </form>
      </div>
    </div>
  );
}
