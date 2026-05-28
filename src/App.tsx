import { useState, useRef, useCallback } from 'react';
import { Background } from './components/Background';
import { SettingsModal } from './components/SettingsModal';
import {
  TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakSelect, TweakColor, TweakButton,
} from './components/TweaksPanel';
import { WIDGET_REGISTRY, ALLOWED_SIZES } from './components/widgets';
import { useTweaks } from './hooks/useTweaks';
import { useViewport } from './hooks/useViewport';
import { collides, reflowLayout, findFreeSlot, COLS, ROWS } from './lib/layout';
import type { TweakValues, WidgetItem, AccentConfig, TypefaceConfig, DisplayFontConfig, BgOption, DragState, ResizeState } from './types';

// ─── Constants ────────────────────────────────────────────────────

const ACCENTS: Record<string, AccentConfig> = {
  aurora:   { color: '#9aa6ff', label: 'AURORA',   palette: ['#9aa6ff','#67f4d6','#a47fff'] },
  sunset:   { color: '#ff9a6c', label: 'SUNSET',   palette: ['#ff9a6c','#ff6e8a','#ffcb6c'] },
  lavender: { color: '#c6a0ff', label: 'LAVENDER', palette: ['#c6a0ff','#9a85ff','#ffaaff'] },
  sage:     { color: '#9ad6a5', label: 'SAGE',     palette: ['#9ad6a5','#7ab8a0','#c5dba0'] },
};

const BG_OPTIONS: BgOption[] = [
  { id: 'time',     label: 'Time of day' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'sunset',   label: 'Sunset' },
  { id: 'aurora',   label: 'Aurora' },
  { id: 'paper',    label: 'Paper' },
];

const TYPEFACES: Record<string, TypefaceConfig> = {
  geist:  { label: 'Geist',    sans: '"Geist", ui-sans-serif, sans-serif',           mono: '"Geist Mono", ui-monospace, monospace' },
  inter:  { label: 'Inter',    sans: '"Inter", ui-sans-serif, sans-serif',           mono: '"JetBrains Mono", ui-monospace, monospace' },
  plex:   { label: 'IBM Plex', sans: '"IBM Plex Sans", ui-sans-serif, sans-serif',   mono: '"IBM Plex Mono", ui-monospace, monospace' },
  system: { label: 'System',   sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, sans-serif', mono: 'ui-monospace, "SF Mono", Menlo, monospace' },
};

const DISPLAY_FONTS: Record<string, DisplayFontConfig> = {
  instrument: { label: 'Instrument Serif', css: '"Instrument Serif", "Times New Roman", serif' },
  fraunces:   { label: 'Fraunces',         css: '"Fraunces", serif' },
  match:      { label: 'Match sans',       css: 'inherit' },
};

const TWEAK_DEFAULTS: TweakValues = {
  dark: true,
  background: 'time',
  accent: 'aurora',
  density: 'regular',
  typeface: 'geist',
  displayFont: 'instrument',
  weight: 500,
};

const LAYOUT_KEY = 'wb.layout.v2';

const DEFAULT_LAYOUT: WidgetItem[] = [
  { id: 'w-clock',   type: 'clock',    x: 5,  y: 1, w: 4, h: 4 },
  { id: 'w-weather', type: 'weather',  x: 1,  y: 1, w: 2, h: 2 },
  { id: 'w-tokens',  type: 'tokens',   x: 3,  y: 1, w: 2, h: 2 },
  { id: 'w-pomo',    type: 'pomodoro', x: 9,  y: 1, w: 2, h: 2 },
  { id: 'w-markets', type: 'markets',  x: 11, y: 1, w: 3, h: 2 },
  { id: 'w-music',   type: 'music',    x: 1,  y: 3, w: 4, h: 2 },
  { id: 'w-github',  type: 'github',   x: 9,  y: 3, w: 4, h: 2 },
  { id: 'w-todo',    type: 'todo',     x: 1,  y: 5, w: 3, h: 2 },
  { id: 'w-notes',   type: 'notes',    x: 4,  y: 5, w: 3, h: 2 },
  { id: 'w-system',  type: 'system',   x: 7,  y: 5, w: 3, h: 2 },
  { id: 'w-cal',     type: 'calendar', x: 10, y: 5, w: 4, h: 2 },
];

function loadLayout(): WidgetItem[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetItem[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return DEFAULT_LAYOUT;
}

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [layout, setLayout] = useState<WidgetItem[]>(loadLayout);
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vw = useViewport();
  const isStacked = vw < 900;

  // Apply theme / typography
  const accent = ACCENTS[t.accent] ?? ACCENTS.aurora;
  const typeface = TYPEFACES[t.typeface] ?? TYPEFACES.geist;
  const displayFont = DISPLAY_FONTS[t.displayFont] ?? DISPLAY_FONTS.instrument;

  // Sync CSS variables to DOM
  useState(() => {
    document.body.classList.toggle('theme-light', !t.dark);
    document.body.classList.remove('density-compact', 'density-regular', 'density-cozy');
    document.body.classList.add(`density-${t.density}`);
    document.documentElement.style.setProperty('--accent', accent.color);
    document.body.style.setProperty('--font-sans', typeface.sans);
    document.body.style.setProperty('--font-mono', typeface.mono);
    document.body.style.setProperty('--font-display', displayFont.css === 'inherit' ? typeface.sans : displayFont.css);
    document.body.style.setProperty('--w-base', String(t.weight));
  });

  // Also update on changes via useEffect pattern inline
  const applyTheme = useCallback(() => {
    document.body.classList.toggle('theme-light', !t.dark);
    document.body.classList.remove('density-compact', 'density-regular', 'density-cozy');
    document.body.classList.add(`density-${t.density}`);
    document.documentElement.style.setProperty('--accent', accent.color);
    document.body.style.setProperty('--font-sans', typeface.sans);
    document.body.style.setProperty('--font-mono', typeface.mono);
    document.body.style.setProperty('--font-display', displayFont.css === 'inherit' ? typeface.sans : displayFont.css);
    document.body.style.setProperty('--w-base', String(t.weight));
  }, [t.dark, t.density, accent.color, typeface, displayFont, t.weight]);
  applyTheme();

  // Persist layout
  const saveLayout = (l: WidgetItem[]) => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch {}
  };

  // ─── Grid metrics ─────────────────────────────────────────────
  const getMetrics = useCallback(() => {
    const el = gridRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const gap = parseFloat(cs.getPropertyValue('--gap')) || 10;
    const cellW = (r.width  - (COLS - 1) * gap) / COLS;
    const cellH = (r.height - (ROWS - 1) * gap) / ROWS;
    return { r, gap, cellW, cellH };
  }, []);

  const cellStyle = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
    left:   `calc((var(--cellW) + var(--gap)) * ${x - 1})`,
    top:    `calc((var(--cellH) + var(--gap)) * ${y - 1})`,
    width:  `calc(var(--cellW) * ${w} + var(--gap) * ${w - 1})`,
    height: `calc(var(--cellH) * ${h} + var(--gap) * ${h - 1})`,
  });

  // ─── Drag ─────────────────────────────────────────────────────
  const onPointerDownMove = (e: React.PointerEvent, item: WidgetItem) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button,input,textarea,.resize')) return;
    e.preventDefault();
    const m = getMetrics();
    if (!m) return;
    const startX = e.clientX, startY = e.clientY;
    const origX = item.x, origY = item.y;
    let curX = origX, curY = origY;
    const baseLayout = layout;
    let prevPositions = new Map(baseLayout.map((i) => [i.id, { x: i.x, y: i.y }]));

    const tryReflow = (cx: number, cy: number) => {
      const result = reflowLayout(baseLayout, item.id, cx, cy, prevPositions);
      if (result.valid) {
        prevPositions = new Map(result.layout.map((i) => [i.id, { x: i.x, y: i.y }]));
        setDrag({ id: item.id, gx: cx, gy: cy, w: item.w, h: item.h, preview: result.layout, valid: true });
      } else {
        setDrag({ id: item.id, gx: cx, gy: cy, w: item.w, h: item.h, preview: baseLayout, valid: false });
      }
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const tgtX = Math.round(origX - 1 + dx / (m.cellW + m.gap)) + 1;
      const tgtY = Math.round(origY - 1 + dy / (m.cellH + m.gap)) + 1;
      const cx = Math.max(1, Math.min(COLS - item.w + 1, tgtX));
      const cy = Math.max(1, Math.min(ROWS - item.h + 1, tgtY));
      if (cx !== curX || cy !== curY) { curX = cx; curY = cy; tryReflow(cx, cy); }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag((d) => {
        if (d?.valid && d.preview) {
          setLayout(d.preview);
          saveLayout(d.preview);
        }
        return null;
      });
    };
    tryReflow(origX, origY);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Resize ───────────────────────────────────────────────────
  const onPointerDownResize = (e: React.PointerEvent, item: WidgetItem) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const m = getMetrics();
    if (!m) return;
    const startX = e.clientX, startY = e.clientY;
    const origW = item.w, origH = item.h;
    let curW = origW, curH = origH;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const targetW = Math.max(1, Math.round(origW + dx / (m.cellW + m.gap)));
      const targetH = Math.max(1, Math.round(origH + dy / (m.cellH + m.gap)));
      let best = ALLOWED_SIZES[0], bestD = Infinity;
      for (const s of ALLOWED_SIZES) {
        if (item.x + s.w - 1 > COLS || item.y + s.h - 1 > ROWS) continue;
        const d = Math.abs(s.w - targetW) + Math.abs(s.h - targetH);
        if (d < bestD) { best = s; bestD = d; }
      }
      if (best.w !== curW || best.h !== curH) {
        curW = best.w; curH = best.h;
        setResize({ id: item.id, w: best.w, h: best.h });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setResize((R) => {
        if (R && !collides(layout, item.id, item.x, item.y, R.w, R.h)) {
          setLayout((L) => {
            const next = L.map((x) => x.id === item.id ? { ...x, w: R.w, h: R.h } : x);
            saveLayout(next);
            return next;
          });
        }
        return null;
      });
    };
    setResize({ id: item.id, w: origW, h: origH });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Add / remove ─────────────────────────────────────────────
  const addWidget = (type: string) => {
    const def = WIDGET_REGISTRY.find((w) => w.type === type);
    if (!def) return;
    const slot = findFreeSlot(layout, def.defaultSize.w, def.defaultSize.h);
    const next = [...layout, { id: `w-${type}-${Date.now().toString(36)}`, type, x: slot.x, y: slot.y, w: def.defaultSize.w, h: def.defaultSize.h }];
    setLayout(next);
    saveLayout(next);
    setPicker(false);
  };

  const removeWidget = (id: string) => {
    const next = layout.filter((it) => it.id !== id);
    setLayout(next);
    saveLayout(next);
  };

  const resetLayout = () => {
    localStorage.removeItem(LAYOUT_KEY);
    setLayout(DEFAULT_LAYOUT);
  };

  // ─── Toast ────────────────────────────────────────────────────
  const flashToast = (msg: string, kind = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  };

  // ─── Export / Import ──────────────────────────────────────────
  const exportData = () => {
    const readLS = <T,>(k: string, fallback: T): T => {
      try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v) as T; }
      catch { return fallback; }
    };
    const payload = {
      version: 'wb.export.v1',
      exportedAt: new Date().toISOString(),
      app: 'window brain',
      layout,
      data: {
        todos: readLS<unknown>('wb.todos.v1', null),
        notes: readLS<unknown>('wb.notes.v1', null),
        calendar: readLS<unknown>('wb.calendar.v1', null),
      },
      tweaks: { ...t },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `window-brain-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashToast('エクスポートしました');
  };

  const triggerImport = () => fileInputRef.current?.click();

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as {
        version: string;
        layout?: WidgetItem[];
        data?: { todos?: unknown; notes?: unknown; calendar?: unknown };
        tweaks?: Partial<TweakValues>;
      };
      if (!json || json.version !== 'wb.export.v1') {
        flashToast('対応していないファイルです', 'err');
        return;
      }
      if (!confirm('現在のレイアウト・タスク・メモを上書きします。よろしいですか？')) return;

      if (Array.isArray(json.layout)) { setLayout(json.layout); saveLayout(json.layout); }
      if (json.data) {
        if (Array.isArray(json.data.todos)) localStorage.setItem('wb.todos.v1', JSON.stringify(json.data.todos));
        if (typeof json.data.notes === 'string') localStorage.setItem('wb.notes.v1', JSON.stringify(json.data.notes));
        if (json.data.calendar && typeof json.data.calendar === 'object') localStorage.setItem('wb.calendar.v1', JSON.stringify(json.data.calendar));
        window.dispatchEvent(new CustomEvent('wb:data-updated'));
      }
      if (json.tweaks) setTweak(json.tweaks);
      flashToast('インポートしました');
    } catch {
      flashToast('JSONを読み込めませんでした', 'err');
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  const now = new Date();
  const tag = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase() + ' · ' +
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(now).toUpperCase();

  return (
    <div className="app">
      <Background bgKind={t.background} dark={t.dark} />

      <div className="dock">
        <div className="l">
          <span>{tag}</span>
          <span className="dot"></span>
          <span>{layout.length} WIDGETS</span>
        </div>
        <div className="r">
          <button onClick={exportData} title="JSONとして書き出す">EXPORT</button>
          <button onClick={triggerImport} title="JSONから読み込む">IMPORT</button>
          <span className="dot"></span>
          <button onClick={() => setSettings(true)} title="設定">SETTINGS</button>
          <button className="add" onClick={() => setPicker(true)}>
            <span className="plus">+</span><span>ADD</span>
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportFile} />
        </div>
      </div>

      <div className="surface">
        {isStacked ? (
          <div className="stack">
            {[...layout].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => {
              const def = WIDGET_REGISTRY.find((w) => w.type === item.type);
              if (!def) return null;
              const W = def.Component;
              const klass = item.h >= 4 ? 'hero' : item.h >= 3 ? 'tall' : '';
              const stackSize = { w: Math.max(item.w, 3), h: item.h };
              return (
                <div key={item.id} className={`w ${klass}`}>
                  <W size={stackSize} />
                  <button className="close" onClick={() => removeWidget(item.id)}>×</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`grid ${drag ? 'is-editing' : ''}`} ref={gridRef}>
            {drag && (
              <div className={`ghost ${drag.valid ? '' : 'invalid'}`} style={cellStyle(drag.gx, drag.gy, drag.w, drag.h)} />
            )}
            {resize && (() => {
              const it = layout.find((l) => l.id === resize.id);
              if (!it) return null;
              const valid = !collides(layout, resize.id, it.x, it.y, resize.w, resize.h);
              return (
                <div className="ghost" style={{ ...cellStyle(it.x, it.y, resize.w, resize.h), borderColor: valid ? 'var(--accent)' : '#ff6a7a', background: valid ? 'rgba(154,166,255,.06)' : 'rgba(255,106,122,.06)' }} />
              );
            })()}

            {layout.map((item) => {
              const def = WIDGET_REGISTRY.find((w) => w.type === item.type);
              if (!def) return null;
              const W = def.Component;
              const isDrag = drag?.id === item.id;
              const isResize = resize?.id === item.id;

              let pos = { x: item.x, y: item.y, w: item.w, h: item.h };
              if (isDrag) {
                pos = { x: drag.gx, y: drag.gy, w: drag.w, h: drag.h };
              } else if (drag?.preview && drag.valid) {
                const p = drag.preview.find((p) => p.id === item.id);
                if (p) pos = { x: p.x, y: p.y, w: p.w, h: p.h };
              }
              if (isResize) { pos.w = resize.w; pos.h = resize.h; }

              return (
                <div
                  key={item.id}
                  className={[
                    'w',
                    isDrag ? 'dragging' : '',
                    isDrag && !drag.valid ? 'invalid' : '',
                    isResize ? 'resizing' : '',
                    drag && !isDrag ? 'reflowing' : '',
                  ].join(' ').trim()}
                  style={cellStyle(pos.x, pos.y, pos.w, pos.h)}
                  onPointerDown={(e) => onPointerDownMove(e, item)}
                >
                  <W size={{ w: pos.w, h: pos.h }} />
                  <button className="close" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeWidget(item.id)}>×</button>
                  <div className="resize" onPointerDown={(e) => onPointerDownResize(e, item)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picker && (
        <div className="picker-bd" onClick={() => setPicker(false)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-hd">
              <span>ウィジェットを追加</span>
              <button className="x" onClick={() => setPicker(false)}>CLOSE ✕</button>
            </div>
            <div className="picker-grid">
              {WIDGET_REGISTRY.map((w) => {
                const used = layout.filter((it) => it.type === w.type).length;
                return (
                  <button key={w.type} className="picker-card" onClick={() => addWidget(w.type)}>
                    <div className="n">{w.label}</div>
                    <div className="m">{w.defaultSize.w}×{w.defaultSize.h}{used > 0 ? ` · ${used} active` : ''}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={settings}
        onClose={() => setSettings(false)}
        t={t}
        setTweak={setTweak}
        ACCENTS={ACCENTS}
        BG_OPTIONS={BG_OPTIONS}
        TYPEFACES={TYPEFACES}
        DISPLAY_FONTS={DISPLAY_FONTS}
        layoutCount={layout.length}
        onResetLayout={resetLayout}
        onExport={exportData}
        onImport={triggerImport}
      />

      {toast && (
        <div className={`wb-toast ${toast.kind === 'err' ? 'err' : ''}`}>{toast.msg}</div>
      )}

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />

        <TweakSection label="Background" />
        <TweakSelect label="Style" value={t.background}
          options={BG_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(v) => setTweak('background', v)} />

        <TweakSection label="Accent" />
        <TweakColor label="Color" value={accent.color}
          options={Object.values(ACCENTS).map((a) => a.color)}
          onChange={(v) => {
            const found = Object.entries(ACCENTS).find(([, a]) => a.color === v);
            if (found) setTweak('accent', found[0]);
          }} />

        <TweakSection label="Density" />
        <TweakRadio label="Spacing" value={t.density}
          options={['compact', 'regular', 'cozy']}
          onChange={(v) => setTweak('density', v)} />

        <TweakSection label="Typography" />
        <TweakSelect label="Typeface" value={t.typeface}
          options={Object.entries(TYPEFACES).map(([id, f]) => ({ value: id, label: f.label }))}
          onChange={(v) => setTweak('typeface', v)} />
        <TweakSelect label="Display" value={t.displayFont}
          options={Object.entries(DISPLAY_FONTS).map(([id, f]) => ({ value: id, label: f.label }))}
          onChange={(v) => setTweak('displayFont', v)} />
        <TweakRadio label="Weight" value={t.weight}
          options={[{ value: 300, label: 'Light' }, { value: 400, label: 'Regular' }, { value: 500, label: 'Medium' }]}
          onChange={(v) => setTweak('weight', v as number)} />

        <TweakSection label="Layout" />
        <TweakButton label="レイアウトをリセット" onClick={resetLayout} />
      </TweaksPanel>
    </div>
  );
}
