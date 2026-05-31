import { useState, useEffect } from 'react';
import { Head } from '../Head';
import type { Size } from '../../types';

const STORAGE_KEY = 'wb.books.v1';

type BookStatus = 'want' | 'reading' | 'done';

interface Book {
  id: number;
  title: string;
  status: BookStatus;
  addedAt: string;
}

const STATUS_LABELS: Record<BookStatus, string> = {
  want: '読みたい',
  reading: '読書中',
  done: '読了',
};

const STATUS_NEXT: Record<BookStatus, BookStatus> = {
  want: 'reading',
  reading: 'done',
  done: 'want',
};

const STATUS_COLOR: Record<BookStatus, string> = {
  want: 'var(--ink-mute)',
  reading: 'var(--accent,#9aa6ff)',
  done: '#5dd6a0',
};

type FilterKey = 'all' | BookStatus;

function load(): Book[] {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(p)) return p;
  } catch {}
  return [];
}

function save(items: Book[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function BooksWidget({ size }: { size: Size }) {
  const [books, setBooks] = useState<Book[]>(load);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { save(books); }, [books]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBooks((prev) => [...prev, { id: Date.now(), title: newTitle.trim(), status: 'want', addedAt: new Date().toISOString() }]);
    setNewTitle('');
  };

  const cycleStatus = (id: number) => {
    setBooks((prev) => prev.map((b) => b.id !== id ? b : { ...b, status: STATUS_NEXT[b.status] }));
  };

  const remove = (id: number) => setBooks((prev) => prev.filter((b) => b.id !== id));

  const filters: FilterKey[] = ['all', 'want', 'reading', 'done'];
  const filterLabel: Record<FilterKey, string> = { all: '全て', ...STATUS_LABELS };

  const visible = filter === 'all' ? books : books.filter((b) => b.status === filter);

  return (
    <div className="w-body">
      <Head title="BOOKS" right={
        <span className="mono muted" style={{ fontSize: 10 }}>{books.length} 冊</span>
      } />
      <div className="w-content" style={{ gap: 6, overflow: 'hidden', minHeight: 0 }}>
        {/* Filter tabs */}
        <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? 'var(--accent,#9aa6ff)' : 'var(--chip)', border: 'none', borderRadius: 5, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: filter === f ? '#0a0d14' : 'var(--ink-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '.06em', transition: 'all .15s' }}>
              {filterLabel[f]}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {visible.map((book) => (
            <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '.5px solid var(--rule)', flexShrink: 0 }}>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => cycleStatus(book.id)}
                style={{ background: 'transparent', border: `.5px solid ${STATUS_COLOR[book.status]}`, borderRadius: 5, padding: '1px 6px', fontSize: 9, cursor: 'pointer', color: STATUS_COLOR[book.status], fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {STATUS_LABELS[book.status]}
              </button>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: book.status === 'done' ? 0.5 : 1 }}>
                {book.title}
              </span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(book.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '2px 5px', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}

          <form onSubmit={add} onPointerDown={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', flexShrink: 0 }}>
            <span style={{ width: 18, height: 18, border: '1.5px dashed var(--rule-strong)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-faint)', fontSize: 15, lineHeight: 1 }}>+</span>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="本のタイトル"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', fontSize: 13 }} />
            <button type="submit"
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>ADD</button>
          </form>
        </div>
      </div>
    </div>
  );
}
