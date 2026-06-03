import { useState, useEffect, useRef, useCallback } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

// ─── Storage keys ─────────────────────────────────────────────────

const TODOS_KEY           = 'wb.todos.v2';
const TODOS_LEGACY_KEY    = 'wb.todos.v1';
const TODOIST_TOKEN_KEY   = 'wb.todoist.token';

// ─── Types ────────────────────────────────────────────────────────

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
  category?: string;
  dueDate?: string;      // "YYYY-MM-DD"
  indent?: number;       // 0–3
  source?: 'local' | 'todoist';
  externalId?: string;
}

// ─── Categories ───────────────────────────────────────────────────

const CATS = [
  { id: 'work',     label: '仕事',  color: 'var(--accent)' },
  { id: 'personal', label: '個人',  color: '#4fffb0' },
  { id: 'study',    label: '学習',  color: '#60b8ff' },
  { id: 'other',    label: 'その他', color: '#ffb347' },
] as const;
type CatId = typeof CATS[number]['id'];

// ─── Date helpers ─────────────────────────────────────────────────

function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dueBadge(due: string): { label: string; color: string } {
  const today = localDateStr();
  if (due < today)           return { label: '期限切れ', color: '#ff6a7a' };
  if (due === today)         return { label: '今日',    color: 'var(--accent)' };
  if (due === localDateStr(1)) return { label: '明日',  color: '#ffb347' };
  const [, m, d] = due.split('-');
  return { label: `${parseInt(m)}/${parseInt(d)}`, color: 'var(--ink-mute)' };
}

// ─── Persistence ──────────────────────────────────────────────────

function migrateItem(raw: Record<string, unknown>): Todo {
  const id = Number(raw.id) || Date.now();
  return {
    id,
    text: String(raw.text ?? ''),
    done: Boolean(raw.done),
    createdAt: typeof raw.createdAt === 'string'
      ? raw.createdAt : new Date(id > 1e12 ? id : Date.now()).toISOString(),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
    category: typeof raw.category === 'string' ? raw.category : undefined,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
    indent: typeof raw.indent === 'number' ? Math.min(3, Math.max(0, raw.indent)) : 0,
    source: raw.source === 'todoist' ? 'todoist' : 'local',
    externalId: typeof raw.externalId === 'string' ? raw.externalId : undefined,
  };
}

function loadTodos(): Todo[] {
  for (const key of [TODOS_KEY, TODOS_LEGACY_KEY]) {
    try {
      const p = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (Array.isArray(p) && p.length) return p.map(migrateItem);
    } catch {}
  }
  return [];
}

function saveTodos(items: Todo[]) {
  try { localStorage.setItem(TODOS_KEY, JSON.stringify(items)); } catch {}
}

function exportJSON(items: Todo[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href: url,
    download: `tasks-${localDateStr()}.json`,
  }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Todoist API ──────────────────────────────────────────────────

async function todoistFetch(token: string): Promise<Todo[]> {
  const r = await fetch('https://api.todoist.com/rest/v2/tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as Array<{
    id: string; content: string; is_completed: boolean;
    due?: { date: string };
  }>;
  return data.map(t => ({
    id: parseInt(t.id, 10) || Date.now(),
    text: t.content,
    done: t.is_completed,
    createdAt: new Date().toISOString(),
    dueDate: t.due?.date,
    source: 'todoist' as const,
    externalId: t.id,
  }));
}

async function todoistClose(token: string, id: string) {
  await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function todoistReopen(token: string, id: string) {
  await fetch(`https://api.todoist.com/rest/v2/tasks/${id}/reopen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Component ────────────────────────────────────────────────────

export function TodoWidget({ size }: { size: Size }) {
  const [items, setItems]         = useState<Todo[]>(loadTodos);
  const [newText, setNewText]     = useState('');
  const [newDue, setNewDue]       = useState('');
  const [newCat, setNewCat]       = useState('');
  const [newIndent, setNewIndent] = useState(0);
  const [filterCat, setFilterCat] = useState('');
  const [editId, setEditId]       = useState<number | null>(null);
  const [editText, setEditText]   = useState('');
  const [editDue, setEditDue]     = useState('');
  const editRef  = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  // Todoist
  const [token, setToken]           = useState(() => localStorage.getItem(TODOIST_TOKEN_KEY) ?? '');
  const [tdItems, setTdItems]       = useState<Todo[]>([]);
  const [tdLoading, setTdLoading]   = useState(false);
  const [tdErr, setTdErr]           = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInput, setTokenInput]     = useState('');

  // ── Persist local ──
  useEffect(() => { saveTodos(items); }, [items]);

  // ── External event ──
  useEffect(() => {
    const onUpdate = () => setItems(loadTodos());
    window.addEventListener('wb:data-updated', onUpdate);
    return () => window.removeEventListener('wb:data-updated', onUpdate);
  }, []);

  // ── Todoist sync ──
  const syncTodoist = useCallback(async (t: string) => {
    if (!t) return;
    setTdLoading(true); setTdErr('');
    try { setTdItems(await todoistFetch(t)); }
    catch (e) { setTdErr(e instanceof Error ? e.message : 'Error'); }
    finally { setTdLoading(false); }
  }, []);

  useEffect(() => {
    if (!token) { setTdItems([]); return; }
    syncTodoist(token);
    const id = setInterval(() => syncTodoist(token), 5 * 60_000);
    return () => clearInterval(id);
  }, [token, syncTodoist]);

  // ── Merged & sorted ──
  const allItems = [...items, ...tdItems];
  const catCounts = Object.fromEntries(
    CATS.map(c => [c.id, allItems.filter(i => i.category === c.id && !i.done).length])
  );
  const usedCats = CATS.filter(c => allItems.some(i => i.category === c.id));

  const visible = (filterCat ? allItems.filter(i => i.category === filterCat) : allItems)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1; if (b.dueDate) return 1;
      return 0;
    });

  const doneCount = allItems.filter(i => i.done).length;

  // ── Actions ──
  const toggle = async (id: number) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    const now = new Date().toISOString();
    if (item.source === 'todoist' && item.externalId && token) {
      const next = !item.done;
      setTdItems(p => p.map(i => i.id === id ? { ...i, done: next, completedAt: next ? now : undefined } : i));
      try { next ? await todoistClose(token, item.externalId) : await todoistReopen(token, item.externalId); } catch {}
    } else {
      setItems(p => p.map(i => {
        if (i.id !== id) return i;
        const next = !i.done;
        return { ...i, done: next, completedAt: next ? now : undefined };
      }));
    }
  };

  const remove = (id: number) => {
    if (allItems.find(i => i.id === id)?.source === 'todoist')
      setTdItems(p => p.filter(i => i.id !== id));
    else
      setItems(p => p.filter(i => i.id !== id));
  };

  const startEdit = (item: Todo) => {
    setEditId(item.id); setEditText(item.text); setEditDue(item.dueDate ?? '');
    setTimeout(() => editRef.current?.focus(), 20);
  };

  const saveEdit = () => {
    if (editId !== null) {
      const t = editText.trim();
      if (t) setItems(p => p.map(i => i.id === editId ? { ...i, text: t, dueDate: editDue || undefined } : i));
    }
    setEditId(null);
  };

  const indent = (id: number, delta: 1 | -1) => {
    setItems(p => p.map(i => i.id === id
      ? { ...i, indent: Math.min(3, Math.max(0, (i.indent ?? 0) + delta)) }
      : i));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setItems(p => [{
      id: Date.now(), text: newText.trim(), done: false,
      createdAt: new Date().toISOString(),
      category: newCat || undefined,
      dueDate: newDue || undefined,
      indent: newIndent || undefined,
      source: 'local',
    }, ...p]);
    setNewText(''); setNewDue(''); setNewCat(''); setNewIndent(0);
  };

  const saveSettings = () => {
    const t = tokenInput.trim();
    localStorage.setItem(TODOIST_TOKEN_KEY, t);
    setToken(t); setShowSettings(false);
    if (!t) setTdItems([]);
  };

  const catColor = (id: string) => CATS.find(c => c.id === id)?.color ?? 'var(--ink-faint)';

  return (
    <div className="w-body">
      <Head
        title="TASKS"
        editable
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="mono muted" style={{ fontSize: 10 }}>{doneCount}/{allItems.length}</span>
            {token && (
              <button onPointerDown={e => e.stopPropagation()} onClick={() => syncTodoist(token)}
                style={hdrBtn(tdLoading)}>
                {tdLoading ? '⟳' : 'T'}
              </button>
            )}
            <button onPointerDown={e => e.stopPropagation()}
              onClick={() => { setTokenInput(token); setShowSettings(true); }}
              style={hdrBtn(false)}>⚙</button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => exportJSON(items)}
              style={hdrBtn(false)} title="エクスポート">↑</button>
            <button onPointerDown={e => e.stopPropagation()} onClick={() => fileRef.current?.click()}
              style={hdrBtn(false)} title="インポート">↓</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = '';
                if (!f) return;
                try { const d = JSON.parse(await f.text()); if (Array.isArray(d)) setItems(d.map(migrateItem)); }
                catch { alert('読み込みに失敗しました'); }
              }} />
          </div>
        }
      />

      {/* ── Settings overlay ── */}
      {showSettings && (
        <div onPointerDown={e => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(8,10,16,.94)', backdropFilter: 'blur(12px)', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 14, padding: 18, overflow: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.45)' }}>TASKS SETTINGS</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.35)' }}>TODOIST API TOKEN</div>
            <input type="password" placeholder="トークンを貼り付け" value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveSettings(); if (e.key === 'Escape') setShowSettings(false); }}
              autoFocus
              style={{ background: 'rgba(255,255,255,.07)', border: '.5px solid rgba(255,255,255,.18)', borderRadius: 8, padding: '7px 10px', color: '#fff', font: 'inherit', fontSize: 12, outline: 'none' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,.28)', lineHeight: 1.6 }}>
              Todoist アプリ → 設定 → 連携 → API トークン
            </div>
            {tdErr && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ff6a7a' }}>Error: {tdErr}</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={saveSettings}
              style={overlayBtn('var(--accent)', '#0a0d14')}>保存</button>
            <button onClick={() => setShowSettings(false)}
              style={overlayBtn('rgba(255,255,255,.08)', 'rgba(255,255,255,.7)')}>CANCEL</button>
            {token && (
              <button onClick={() => setTokenInput('')}
                style={overlayBtn('transparent', '#ff6a7a', '.5px solid rgba(255,100,100,.3)')}>連携解除</button>
            )}
          </div>
        </div>
      )}

      {/* ── Category filter ── */}
      {usedCats.length > 0 && (
        <div onPointerDown={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 3, padding: '4px 0 3px', flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterCat('')} style={filterBtn(filterCat === '')}>ALL</button>
          {usedCats.map(cat => (
            <button key={cat.id} onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
              style={{ ...filterBtn(filterCat === cat.id), display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color }} />
              <span>{cat.label}</span>
              {catCounts[cat.id] > 0 && <span style={{ color: cat.color, opacity: .85 }}>{catCounts[cat.id]}</span>}
            </button>
          ))}
          {token && tdItems.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.1em', color: '#e44332', opacity: .65, padding: '3px 6px', border: '.5px solid var(--rule)', borderRadius: 5, alignSelf: 'center' }}>
              ● T {tdItems.filter(i => !i.done).length}
            </span>
          )}
        </div>
      )}

      <div className="w-content" style={{ gap: 0, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: 2 }}>

          {visible.map(item => {
            const lvl = item.indent ?? 0;
            return (
              <div key={item.id} className="todo-row"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0, paddingLeft: lvl * 14 }}>

                {/* Indent guide line */}
                {lvl > 0 && (
                  <span style={{ position: 'absolute', left: lvl * 14 - 6, width: 1, height: '100%', background: 'var(--rule-strong)', opacity: .5, pointerEvents: 'none' }} />
                )}

                {/* Category dot */}
                {item.category && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: catColor(item.category), flexShrink: 0 }} />
                )}

                {/* Checkbox */}
                <button onPointerDown={e => e.stopPropagation()} onClick={() => toggle(item.id)}
                  style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, cursor: 'pointer', padding: 0, border: item.source === 'todoist' ? '1.5px solid #e44332' : '1.5px solid var(--rule-strong)', background: item.done ? (item.source === 'todoist' ? '#e44332' : 'var(--accent)') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.done && (
                    <svg width="8" height="8" viewBox="0 0 10 10">
                      <path d="M1.5 5L4 7.5L8.5 2" stroke="#0a0d14" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {editId === item.id ? (
                  <>
                    <input ref={editRef} value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          indent(item.id, e.shiftKey ? -1 : 1);
                        } else if (e.key === 'Enter') {
                          saveEdit();
                        } else if (e.key === 'Escape') {
                          setEditId(null);
                        }
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      style={{ flex: 1, minWidth: 0, background: 'var(--track)', border: '.5px solid var(--accent)', borderRadius: 5, padding: '2px 6px', color: 'inherit', font: 'inherit', fontSize: 12, outline: 'none' }} />
                    <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                      onPointerDown={e => e.stopPropagation()}
                      style={{ width: 96, background: 'var(--track)', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 4px', color: 'inherit', font: 'inherit', fontSize: 9, outline: 'none', colorScheme: 'dark' }} />
                    <button onPointerDown={e => e.stopPropagation()} onClick={saveEdit}
                      style={{ background: 'var(--accent)', border: 'none', borderRadius: 4, width: 18, height: 18, cursor: 'pointer', flexShrink: 0, color: '#0a0d14', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditId(null)}
                      style={{ background: 'var(--chip)', border: 'none', borderRadius: 4, width: 18, height: 18, cursor: 'pointer', flexShrink: 0, color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
                  </>
                ) : (
                  <>
                    <span onClick={() => !item.done && item.source !== 'todoist' && startEdit(item)}
                      style={{ flex: 1, minWidth: 0, fontSize: 12, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? .35 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: !item.done && item.source !== 'todoist' ? 'pointer' : 'default' }}>
                      {item.text}
                    </span>

                    {item.dueDate && !item.done && (() => {
                      const { label, color } = dueBadge(item.dueDate);
                      return (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.04em', color, background: color === 'var(--accent)' ? 'rgba(198,160,255,.15)' : color + '18', borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>
                          {label}
                        </span>
                      );
                    })()}

                    {item.source === 'todoist' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#e44332', opacity: .6, flexShrink: 0 }}>T</span>
                    )}

                    <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      {!item.done && item.source !== 'todoist' && (
                        <>
                          {lvl > 0 && (
                            <button onPointerDown={e => e.stopPropagation()} onClick={() => indent(item.id, -1)}
                              className="todo-action"
                              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 3px', fontSize: 10, borderRadius: 4, lineHeight: 1 }}>⇤</button>
                          )}
                          {lvl < 3 && (
                            <button onPointerDown={e => e.stopPropagation()} onClick={() => indent(item.id, 1)}
                              className="todo-action"
                              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 3px', fontSize: 10, borderRadius: 4, lineHeight: 1 }}>⇥</button>
                          )}
                          <button onPointerDown={e => e.stopPropagation()} onClick={() => startEdit(item)}
                            className="todo-action"
                            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 4px', fontSize: 11, borderRadius: 4 }}>✎</button>
                        </>
                      )}
                      <button onPointerDown={e => e.stopPropagation()} onClick={() => remove(item.id)}
                        className="todo-action"
                        style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 4px', fontSize: 13, borderRadius: 4 }}>×</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* ── Add form ── */}
          <form onSubmit={add} onPointerDown={e => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '5px 0 2px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: newIndent * 14 }}>
              <button type="submit"
                style={{ width: 15, height: 15, borderRadius: 4, border: '1.5px dashed var(--rule-strong)', background: 'transparent', flexShrink: 0, cursor: 'pointer', padding: 0, color: 'var(--ink-faint)', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              <input value={newText} onChange={e => setNewText(e.target.value)}
                onPointerDown={e => e.stopPropagation()}
                placeholder="新しいタスク..."
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    setNewIndent(v => e.shiftKey ? Math.max(0, v - 1) : Math.min(3, v + 1));
                  }
                }}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 12 }} />
            </div>

            {/* Quick options — appear only when typing */}
            {newText && (
              <div style={{ display: 'flex', gap: 3, paddingLeft: 20, flexWrap: 'wrap' }}>
                {[{ l: '今日', v: localDateStr(0) }, { l: '明日', v: localDateStr(1) }].map(d => (
                  <button key={d.v} type="button" onClick={() => setNewDue(newDue === d.v ? '' : d.v)}
                    style={quickChip(newDue === d.v)}>{d.l}</button>
                ))}
                <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                  style={{ background: 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 4, padding: '1px 4px', color: 'inherit', font: 'inherit', fontSize: 8, outline: 'none', width: 88, colorScheme: 'dark' }} />
                {CATS.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setNewCat(newCat === cat.id ? '' : cat.id)}
                    style={{ ...quickChip(newCat === cat.id), background: newCat === cat.id ? cat.color : 'var(--chip)', color: newCat === cat.id ? '#0a0d14' : 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: newCat === cat.id ? '#0a0d14' : cat.color }} />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────

function hdrBtn(active: boolean): React.CSSProperties {
  return { background: 'transparent', border: 'none', color: active ? 'var(--accent)' : 'var(--ink-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 3px', lineHeight: 1 };
}

function filterBtn(active: boolean): React.CSSProperties {
  return { background: active ? 'var(--chip-hover)' : 'transparent', border: '.5px solid var(--rule)', borderRadius: 5, padding: '2px 7px', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.1em', cursor: 'pointer', color: active ? 'inherit' : 'var(--ink-faint)' };
}

function quickChip(active: boolean): React.CSSProperties {
  return { background: active ? 'var(--accent)' : 'var(--chip)', border: '.5px solid var(--rule)', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.1em', cursor: 'pointer', color: active ? '#0a0d14' : 'var(--ink-mute)' };
}

function overlayBtn(bg: string, color: string, border = 'none'): React.CSSProperties {
  return { background: bg, border, borderRadius: 7, padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', color, fontWeight: bg === 'var(--accent)' ? 500 : undefined };
}
