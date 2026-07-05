import { useState, useEffect, useRef, useCallback } from 'react';
import { Background } from './components/Background';
import { SettingsModal } from './components/SettingsModal';
import {
  TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakSelect, TweakColor, TweakButton,
} from './components/TweaksPanel';
import { WIDGET_REGISTRY, ALLOWED_SIZES } from './components/widgets';
import { useTweaks } from './hooks/useTweaks';
import { useViewport } from './hooks/useViewport';
import { collides, reflowLayout, findFreeSlot, COLS, ROWS } from './lib/layout';
import type { TweakValues, WidgetItem, AccentConfig, TypefaceConfig, DisplayFontConfig, BgOption, DragState, ResizeState, WidgetSettings } from './types';

// ─── Constants ────────────────────────────────────────────────────

const ACCENTS: Record<string, AccentConfig> = {
  aurora:   { color: '#9aa6ff', label: 'AURORA',   palette: ['#9aa6ff','#67f4d6','#a47fff'] },
  sunset:   { color: '#ff9a6c', label: 'SUNSET',   palette: ['#ff9a6c','#ff6e8a','#ffcb6c'] },
  lavender: { color: '#c6a0ff', label: 'LAVENDER', palette: ['#c6a0ff','#9a85ff','#ffaaff'] },
  sage:     { color: '#9ad6a5', label: 'SAGE',     palette: ['#9ad6a5','#7ab8a0','#c5dba0'] },
  neon:     { color: '#39ff14', label: 'NEON',     palette: ['#39ff14','#00e5ff','#ff007f'] },
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
  pixel:  { label: 'Pixel',    sans: '"Pixelify Sans", monospace',                  mono: '"VT323", monospace' },
};

const DISPLAY_FONTS: Record<string, DisplayFontConfig> = {
  instrument: { label: 'Instrument Serif', css: '"Instrument Serif", "Times New Roman", serif' },
  fraunces:   { label: 'Fraunces',         css: '"Fraunces", serif' },
  match:      { label: 'Match sans',       css: 'inherit' },
};

interface DesignPreset {
  id: string;
  name: string;
  badge: string;
  previewBg: string;
  previewAccent: string;
  tweaks: Partial<TweakValues>;
}

const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'lavender',
    name: 'Lavender',
    badge: '🌙',
    previewBg: '#0d0f1a',
    previewAccent: '#c6a0ff',
    tweaks: { dark: true, accent: 'lavender', background: 'time', typeface: 'geist', displayFont: 'instrument', weight: 300, density: 'regular', theme: undefined },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    badge: '✦',
    previewBg: '#080e1e',
    previewAccent: '#9aa6ff',
    tweaks: { dark: true, accent: 'aurora', background: 'aurora', typeface: 'geist', displayFont: 'instrument', weight: 500, density: 'regular', theme: undefined },
  },
  {
    id: 'paper',
    name: 'Paper',
    badge: '☀',
    previewBg: '#f0ebe0',
    previewAccent: '#9ad6a5',
    tweaks: { dark: false, accent: 'sage', background: 'paper', typeface: 'plex', displayFont: 'fraunces', weight: 400, density: 'regular', theme: undefined },
  },
  {
    id: 'pixel',
    name: 'PIXEL',
    badge: '👾',
    previewBg: '#000a00',
    previewAccent: '#39ff14',
    tweaks: { dark: true, accent: 'neon', background: 'midnight', typeface: 'pixel', displayFont: 'match', weight: 400, density: 'compact', theme: 'pixel' },
  },
];

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
  { id: 'w-pomo',    type: 'pomodoro', x: 9,  y: 1, w: 2, h: 2 },
  { id: 'w-markets', type: 'markets',  x: 11, y: 1, w: 3, h: 2 },
  { id: 'w-music',   type: 'music',    x: 1,  y: 3, w: 4, h: 2 },
  { id: 'w-github',  type: 'github',   x: 9,  y: 3, w: 4, h: 2 },
  { id: 'w-todo',    type: 'todo',     x: 1,  y: 5, w: 3, h: 2 },
  { id: 'w-notes',   type: 'notes',    x: 4,  y: 5, w: 2, h: 2 },
  { id: 'w-timer',   type: 'timer',    x: 6,  y: 5, w: 2, h: 2 },
  { id: 'w-alarm',   type: 'alarm',    x: 8,  y: 5, w: 2, h: 2 },
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

// ─── Layout Presets ───────────────────────────────────────────────

interface LayoutPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  items: WidgetItem[];
}

function miniColor(type: string): string {
  const MAP: Record<string, string> = {
    clock:    'rgba(154,166,255,.48)',
    youtube:  'rgba(255,55,55,.40)',
    music:    'rgba(190,80,255,.34)',
    todo:     'rgba(80,210,165,.30)',
    notes:    'rgba(255,210,60,.24)',
    calendar: 'rgba(60,170,255,.30)',
    pomodoro: 'rgba(255,130,60,.30)',
    github:   'rgba(80,210,80,.30)',
    markets:  'rgba(100,230,130,.30)',
    ghpet:    'rgba(255,160,60,.32)',
    weather:  'rgba(120,200,255,.26)',
  };
  return MAP[type] ?? 'rgba(255,255,255,.11)';
}

const MINI_ICONS: Record<string, string> = {
  clock: '◷', youtube: '▶', music: '♪', todo: '≡',
  notes: '✏', calendar: '▦', pomodoro: '⊙', github: '◈',
  markets: '$', weather: '☁', ghpet: '♥', timer: '⏱',
  alarm: '⏰', sticky: '▫', habit: '✦', mood: '◡',
};

function LayoutPreviewMini({ items }: { items: WidgetItem[] }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 56,
      background: 'rgba(0,0,0,.38)', borderRadius: '6px 6px 0 0', overflow: 'hidden',
    }}>
      {items.map((item) => (
        <div key={item.id} style={{
          position: 'absolute',
          left: `calc(${((item.x - 1) / 13) * 100}% + 1.5px)`,
          top: `calc(${((item.y - 1) / 6) * 100}% + 1.5px)`,
          width: `calc(${(item.w / 13) * 100}% - 3px)`,
          height: `calc(${(item.h / 6) * 100}% - 3px)`,
          background: miniColor(item.type),
          border: '.5px solid rgba(255,255,255,.2)',
          borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,.6)', lineHeight: 1, userSelect: 'none' }}>
            {MINI_ICONS[item.type] ?? '·'}
          </span>
        </div>
      ))}
    </div>
  );
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'lp-standard',
    name: 'スタンダード',
    badge: '⊞',
    description: 'バランスの取れた定番配置',
    items: DEFAULT_LAYOUT,
  },
  {
    id: 'lp-cinema',
    name: 'シネマ',
    badge: '▶',
    description: '時計中央・動画5本・タスクサイド',
    items: [
      { id: 'cinema-yt1',   type: 'youtube',  x: 1,  y: 1, w: 4, h: 3 },
      { id: 'cinema-clock', type: 'clock',    x: 5,  y: 1, w: 4, h: 3 },
      { id: 'cinema-yt2',   type: 'youtube',  x: 9,  y: 1, w: 3, h: 3 },
      { id: 'cinema-task',  type: 'todo',     x: 12, y: 1, w: 2, h: 6 },
      { id: 'cinema-yt3',   type: 'youtube',  x: 1,  y: 4, w: 4, h: 3 },
      { id: 'cinema-yt4',   type: 'youtube',  x: 5,  y: 4, w: 4, h: 3 },
      { id: 'cinema-yt5',   type: 'youtube',  x: 9,  y: 4, w: 3, h: 3 },
    ],
  },
  {
    id: 'lp-focus',
    name: 'フォーカス',
    badge: '◉',
    description: '大きな時計＋ポモドーロ＋メモ',
    items: [
      { id: 'focus-clock', type: 'clock',    x: 1,  y: 1, w: 4, h: 6 },
      { id: 'focus-pomo',  type: 'pomodoro', x: 5,  y: 1, w: 5, h: 3 },
      { id: 'focus-todo',  type: 'todo',     x: 5,  y: 4, w: 5, h: 3 },
      { id: 'focus-note',  type: 'notes',    x: 10, y: 1, w: 4, h: 6 },
    ],
  },
  {
    id: 'lp-media',
    name: 'メディア',
    badge: '♫',
    description: '音楽＋動画メインステージ',
    items: [
      { id: 'media-clock', type: 'clock',    x: 1,  y: 1, w: 3, h: 3 },
      { id: 'media-music', type: 'music',    x: 1,  y: 4, w: 3, h: 3 },
      { id: 'media-yt1',   type: 'youtube',  x: 4,  y: 1, w: 6, h: 4 },
      { id: 'media-yt2',   type: 'youtube',  x: 4,  y: 5, w: 6, h: 2 },
      { id: 'media-todo',  type: 'todo',     x: 10, y: 1, w: 4, h: 3 },
      { id: 'media-mkt',   type: 'markets',  x: 10, y: 4, w: 4, h: 3 },
    ],
  },
  {
    id: 'lp-command',
    name: 'コマンド',
    badge: '⌘',
    description: 'カレンダー＋GitHub＋メモ中央',
    items: [
      { id: 'cmd-clock',  type: 'clock',    x: 1, y: 1, w: 3, h: 3 },
      { id: 'cmd-todo',   type: 'todo',     x: 1, y: 4, w: 3, h: 3 },
      { id: 'cmd-notes',  type: 'notes',    x: 4, y: 1, w: 5, h: 6 },
      { id: 'cmd-cal',    type: 'calendar', x: 9, y: 1, w: 5, h: 3 },
      { id: 'cmd-github', type: 'github',   x: 9, y: 4, w: 5, h: 3 },
    ],
  },
  {
    id: 'lp-stage',
    name: 'ステージ',
    badge: '⊡',
    description: '動画4本＋時計＋タスク中央',
    items: [
      { id: 'stage-yt1',   type: 'youtube',  x: 1,  y: 1, w: 5, h: 3 },
      { id: 'stage-clock', type: 'clock',    x: 6,  y: 1, w: 3, h: 3 },
      { id: 'stage-yt2',   type: 'youtube',  x: 9,  y: 1, w: 5, h: 3 },
      { id: 'stage-yt3',   type: 'youtube',  x: 1,  y: 4, w: 5, h: 3 },
      { id: 'stage-todo',  type: 'todo',     x: 6,  y: 4, w: 3, h: 3 },
      { id: 'stage-yt4',   type: 'youtube',  x: 9,  y: 4, w: 5, h: 3 },
    ],
  },
];

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [layout, setLayout] = useState<WidgetItem[]>(loadLayout);
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [liveAccent, setLiveAccent] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vw = useViewport();
  const isStacked = vw < 900;

  // ─── Mobile reorder ───────────────────────────────────────────────
  const MOBILE_ORDER_KEY = 'wb.mobile.order.v1';
  const [mobileEditMode, setMobileEditMode] = useState(false);
  const [mobileOrder, setMobileOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(MOBILE_ORDER_KEY) ?? '[]') as string[]; }
    catch { return []; }
  });
  const [mobileDragId, setMobileDragId] = useState<string | null>(null);
  const [mobileSwapId, setMobileSwapId] = useState<string | null>(null);
  const [mobilePreviewOrder, setMobilePreviewOrder] = useState<string[] | null>(null);
  const mobileOrderRef = useRef(mobileOrder);
  mobileOrderRef.current = mobileOrder;
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileExpandId, setMobileExpandId] = useState<string | null>(null);

  const WIDGET_SETTINGS_KEY = 'wb.widget.settings.v1';
  const [widgetSettings, setWidgetSettings] = useState<Record<string, WidgetSettings>>(() => {
    try { return JSON.parse(localStorage.getItem(WIDGET_SETTINGS_KEY) ?? '{}'); }
    catch { return {}; }
  });
  const updateWidgetSetting = (id: string, key: keyof WidgetSettings, val: string | undefined) => {
    setWidgetSettings((prev) => {
      const next = { ...prev, [id]: { ...prev[id], [key]: val } };
      if (val === undefined) delete next[id][key];
      try { localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Apply theme / typography
  const accent = ACCENTS[t.accent] ?? ACCENTS.aurora;
  const typeface = TYPEFACES[t.typeface] ?? TYPEFACES.geist;
  const displayFont = DISPLAY_FONTS[t.displayFont] ?? DISPLAY_FONTS.instrument;

  // Sync CSS variables to DOM (initial render)
  useState(() => {
    document.body.classList.toggle('theme-light', !t.dark);
    document.body.classList.toggle('theme-pixel', t.theme === 'pixel');
    document.body.classList.remove('density-compact', 'density-regular', 'density-cozy');
    document.body.classList.add(`density-${t.density}`);
    document.documentElement.style.setProperty('--accent', accent.color);
    document.body.style.setProperty('--font-sans', typeface.sans);
    document.body.style.setProperty('--font-mono', typeface.mono);
    document.body.style.setProperty('--font-display', displayFont.css === 'inherit' ? typeface.sans : displayFont.css);
    document.body.style.setProperty('--w-base', String(t.weight));
    // liveAccent is null at init, so accent.color is correct here
  });

  // Also update on changes via useEffect pattern inline
  const applyTheme = useCallback(() => {
    document.body.classList.toggle('theme-light', !t.dark);
    document.body.classList.toggle('theme-pixel', t.theme === 'pixel');
    document.body.classList.remove('density-compact', 'density-regular', 'density-cozy');
    document.body.classList.add(`density-${t.density}`);
    document.documentElement.style.setProperty('--accent', liveAccent ?? accent.color);
    document.body.style.setProperty('--font-sans', typeface.sans);
    document.body.style.setProperty('--font-mono', typeface.mono);
    document.body.style.setProperty('--font-display', displayFont.css === 'inherit' ? typeface.sans : displayFont.css);
    document.body.style.setProperty('--w-base', String(t.weight));
  }, [t.dark, t.theme, t.density, liveAccent, accent.color, typeface, displayFont, t.weight]);
  applyTheme();

  // Persist layout
  const saveLayout = (l: WidgetItem[]) => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch {}
  };

  // Listen for live color from music/video widgets
  useEffect(() => {
    const onLiveColor = (e: Event) => {
      const ce = e as CustomEvent<{ color: string | null }>;
      setLiveAccent(ce.detail.color ?? null);
    };
    window.addEventListener('wb:live-color', onLiveColor);
    return () => window.removeEventListener('wb:live-color', onLiveColor);
  }, []);

  // ─── Fullscreen ───────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Sync mobileOrder when layout changes
  useEffect(() => {
    const sortedIds = [...layout].sort((a, b) => a.y - b.y || a.x - b.x).map((i) => i.id);
    setMobileOrder((prev) => {
      const filtered = prev.filter((id) => layout.some((i) => i.id === id));
      const newIds = sortedIds.filter((id) => !filtered.includes(id));
      const merged = [...filtered, ...newIds];
      try { localStorage.setItem(MOBILE_ORDER_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Arrange panel drag ───────────────────────────────────────────
  const startArrDrag = useCallback((
    el: HTMLElement, pointerId: number, startX: number, startY: number, itemId: string
  ) => {
    const rect = el.getBoundingClientRect();
    const offX = startX - rect.left, offY = startY - rect.top;

    const ghost = document.createElement('div');
    Object.assign(ghost.style, {
      position: 'fixed', zIndex: '400', pointerEvents: 'none',
      width: rect.width + 'px', height: rect.height + 'px',
      left: rect.left + 'px', top: rect.top + 'px',
      borderRadius: '12px', background: 'rgba(22,25,33,.92)',
      border: '1.5px solid var(--accent, #9aa6ff)',
      boxShadow: '0 12px 40px rgba(0,0,0,.55)',
      backdropFilter: 'blur(10px)',
      transform: 'scale(1.04)', transition: 'none',
    });
    document.body.appendChild(ghost);
    setMobileDragId(itemId);

    try { el.setPointerCapture(pointerId); } catch {}

    let currentSwapId: string | null = null;

    const onMove = (ev: PointerEvent) => {
      ghost.style.left = (ev.clientX - offX) + 'px';
      ghost.style.top  = (ev.clientY - offY) + 'px';
      ghost.style.visibility = 'hidden';
      const under = document.elementsFromPoint(ev.clientX, ev.clientY);
      ghost.style.visibility = 'visible';
      const hit = under.find(
        (e) => (e as HTMLElement).dataset?.arrId && (e as HTMLElement).dataset.arrId !== itemId
      ) as HTMLElement | undefined;
      const newSwapId = hit?.dataset.arrId ?? null;
      if (newSwapId === currentSwapId) return;
      currentSwapId = newSwapId;
      setMobileSwapId(newSwapId);
      if (newSwapId) {
        const order = mobileOrderRef.current;
        const filtered = order.filter((id) => id !== itemId);
        const bIdx = filtered.indexOf(newSwapId);
        if (bIdx !== -1) filtered.splice(bIdx, 0, itemId);
        setMobilePreviewOrder(filtered);
      } else {
        setMobilePreviewOrder(null);
      }
    };

    const onEnd = () => {
      ghost.remove();
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerup', onEnd);
      el.removeEventListener('pointercancel', onEnd);
      setMobileDragId(null);
      setMobileSwapId(null);
      setMobilePreviewOrder((preview) => {
        if (preview) {
          try { localStorage.setItem(MOBILE_ORDER_KEY, JSON.stringify(preview)); } catch {}
          setMobileOrder(preview);
        }
        return null;
      });
    };

    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
  }, []);

  const onArrPointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId, startX = e.clientX, startY = e.clientY;

    const onPreMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) {
        window.removeEventListener('pointermove', onPreMove as EventListener);
        window.removeEventListener('pointerup', onPreUp);
        startArrDrag(el, pointerId, startX, startY, itemId);
      }
    };
    const onPreUp = () => {
      window.removeEventListener('pointermove', onPreMove as EventListener);
      window.removeEventListener('pointerup', onPreUp);
    };
    window.addEventListener('pointermove', onPreMove as EventListener, { passive: true });
    window.addEventListener('pointerup', onPreUp);
  }, [startArrDrag]);

  // メイン mobile grid: タップ → 展開モーダル のみ
  const onMobileWidgetPointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
    if ((e.target as HTMLElement).closest('button,input,textarea')) return;
    const startX = e.clientX, startY = e.clientY;

    let moved = false;
    const onPreMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10) moved = true;
    };
    const onPreUp = () => {
      window.removeEventListener('pointermove', onPreMove as EventListener);
      window.removeEventListener('pointerup', onPreUp);
      if (!moved) setMobileExpandId(itemId);
    };
    window.addEventListener('pointermove', onPreMove as EventListener, { passive: true });
    window.addEventListener('pointerup', onPreUp);
  }, []);

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

    let dragStarted = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragStarted) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        dragStarted = true;
        tryReflow(origX, origY);
      }
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
    // Collect every wb.* key from localStorage (includes dynamic keys like wb.daycal.v1.YYYY-MM-DD)
    const store: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('wb.')) continue;
      try { store[key] = JSON.parse(localStorage.getItem(key)!); }
      catch { store[key] = localStorage.getItem(key); }
    }
    const payload = {
      version: 'wb.export.v2',
      exportedAt: new Date().toISOString(),
      app: 'window brain',
      layout,
      tweaks: { ...t },
      store,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json; charset=utf-8' });
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
        tweaks?: Partial<TweakValues>;
        store?: Record<string, unknown>;
        // v1 compat
        data?: { todos?: unknown; notes?: unknown; calendar?: unknown };
      };
      const v = json?.version;
      if (v !== 'wb.export.v1' && v !== 'wb.export.v2') {
        flashToast('対応していないファイルです', 'err');
        return;
      }
      if (!confirm('現在の全データを上書きします。よろしいですか？')) return;

      if (v === 'wb.export.v2' && json.store) {
        // Restore every wb.* key verbatim
        for (const [key, val] of Object.entries(json.store)) {
          if (!key.startsWith('wb.')) continue;
          try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
        }
      } else if (v === 'wb.export.v1' && json.data) {
        // Legacy: restore only the three known keys
        if (Array.isArray(json.data.todos))
          localStorage.setItem('wb.todos.v1', JSON.stringify(json.data.todos));
        if (typeof json.data.notes === 'string')
          localStorage.setItem('wb.notes.v1', JSON.stringify({ content: json.data.notes, updatedAt: new Date().toISOString() }));
        else if (json.data.notes && typeof (json.data.notes as Record<string, unknown>).content === 'string')
          localStorage.setItem('wb.notes.v1', JSON.stringify(json.data.notes));
        if (json.data.calendar && typeof json.data.calendar === 'object')
          localStorage.setItem('wb.calendar.v1', JSON.stringify(json.data.calendar));
      }

      if (Array.isArray(json.layout)) { setLayout(json.layout); saveLayout(json.layout); }
      if (json.tweaks) setTweak(json.tweaks);
      window.dispatchEvent(new CustomEvent('wb:data-updated'));
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
          {isStacked && (
            <button
              onClick={() => { setMobileEditMode(true); setMobileDragId(null); setMobileSwapId(null); setMobilePreviewOrder(null); }}
              title="ウィジェットを並び替え"
            >
              EDIT
            </button>
          )}
          <button onClick={toggleFullscreen} title={isFullscreen ? '全画面を終了' : '全画面表示'}>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</button>
          <button onClick={() => setTweaksOpen(true)} title="カスタマイズ">TWEAKS</button>
          <button onClick={() => setSettings(true)} title="設定">SETTINGS</button>
          <button className="add" onClick={() => setPicker(true)}>
            <span className="plus">+</span><span>ADD</span>
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportFile} />
        </div>
      </div>

      <div className="surface">
        {isStacked ? (
          <div className="mobile-grid">
            {(mobileOrder.length > 0
              ? mobileOrder.map((id) => layout.find((i) => i.id === id)).filter(Boolean) as WidgetItem[]
              : [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
            ).map((item) => {
              const def = WIDGET_REGISTRY.find((w) => w.type === item.type);
              if (!def) return null;
              const W = def.Component;
              const span2 = item.w >= 4 || item.h >= 3;
              const H_MAP: Record<number, number> = { 1: 110, 2: 170, 3: 250, 4: 330 };
              const cellH = H_MAP[Math.min(item.h, 4)] ?? 170;
              const mobileSize = { w: span2 ? Math.max(item.w, 4) : 2, h: item.h };
              return (
                <div
                  key={item.id}
                  className={`w${span2 ? ' mg-span2' : ''}`}
                  style={{ height: cellH }}
                  onPointerDown={(e) => onMobileWidgetPointerDown(e, item.id)}
                >
                  <W size={mobileSize} widgetId={item.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`grid ${drag ? 'is-editing' : ''}`} ref={gridRef}>
            {drag && <div className="drag-overlay" />}
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
                  <W size={{ w: pos.w, h: pos.h }} widgetId={item.id} />
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

      <TweaksPanel externalOpen={tweaksOpen} onExternalClose={() => setTweaksOpen(false)}>
        <TweakSection label="Preset" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {DESIGN_PRESETS.map((p) => {
            const active = t.accent === (p.tweaks.accent ?? '') && t.typeface === (p.tweaks.typeface ?? '') && t.dark === p.tweaks.dark && (t.theme ?? '') === (p.tweaks.theme ?? '');
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setTweak(p.tweaks)}
                style={{
                  appearance: 'none',
                  border: active
                    ? `1.5px solid ${t.dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.55)'}`
                    : `1px solid ${t.dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)'}`,
                  borderRadius: 9, padding: 0, cursor: 'pointer', overflow: 'hidden',
                  background: 'transparent', textAlign: 'left',
                  boxShadow: active ? `inset 0 0 0 1px ${t.dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.4)'}` : 'none',
                  opacity: 1,
                }}
              >
                <div style={{
                  height: 36, background: p.previewBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.previewAccent, boxShadow: `0 0 6px ${p.previewAccent}` }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.previewAccent, opacity: .5 }} />
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.previewAccent, opacity: .25 }} />
                </div>
                <div style={{ padding: '5px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{p.badge}</span><span>{p.name}</span>
                  {active && <span style={{ marginLeft: 'auto', fontSize: 9, opacity: .5 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {LAYOUT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setLayout(p.items); saveLayout(p.items); }}
              style={{
                appearance: 'none',
                border: `1px solid ${t.dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)'}`,
                borderRadius: 9, padding: 0, cursor: 'pointer', overflow: 'hidden',
                background: 'transparent', textAlign: 'left',
              }}
            >
              <LayoutPreviewMini items={p.items} />
              <div style={{ padding: '5px 8px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{p.badge}</span>
                <span>{p.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 400, opacity: .45 }}>{p.description}</span>
              </div>
            </button>
          ))}
        </div>
        <TweakButton label="現在のレイアウトをリセット" onClick={resetLayout} />
      </TweaksPanel>

      {/* ─── Mobile expand overlay ─────────────────────── */}
      {isStacked && mobileExpandId && (() => {
        const item = layout.find((i) => i.id === mobileExpandId);
        const def = item && WIDGET_REGISTRY.find((w) => w.type === item.type);
        if (!item || !def) return null;
        const W = def.Component;
        const ws = widgetSettings[mobileExpandId] ?? {};
        const oa = ws.accent ? ACCENTS[ws.accent] : null;
        const ot = ws.typeface ? TYPEFACES[ws.typeface] : null;
        return (
          <div className="wex-overlay" onClick={() => setMobileExpandId(null)}>
            <div className="wex-sheet"
              onClick={(e) => e.stopPropagation()}
              style={{
                '--accent': oa?.color ?? accent.color,
                '--font-sans': ot?.sans ?? typeface.sans,
                '--font-mono': ot?.mono ?? typeface.mono,
              } as React.CSSProperties}
            >
              <div className="wex-handle" onClick={() => setMobileExpandId(null)} />
              <div className="wex-bar">
                <button className="wex-back" onClick={() => setMobileExpandId(null)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="wex-title">{def.label.toUpperCase()}</span>
              </div>
              <div className="wex-body">
                <div className="w-body">
                  <W size={{ w: 8, h: 6 }} widgetId={mobileExpandId} />
                </div>
              </div>
              <div className="wex-settings">
                <div className="wex-section">
                  <div className="wex-section-label">ACCENT</div>
                  <div className="wex-chips">
                    {Object.entries(ACCENTS).map(([key, cfg]) => (
                      <button key={key}
                        className={`wex-color${(ws.accent === key) || (!ws.accent && t.accent === key) ? ' on' : ''}`}
                        style={{ background: cfg.color }}
                        onClick={() => updateWidgetSetting(mobileExpandId, 'accent', ws.accent === key ? undefined : key)}
                      />
                    ))}
                  </div>
                </div>
                <div className="wex-section">
                  <div className="wex-section-label">TYPEFACE</div>
                  <div className="wex-chips">
                    {Object.entries(TYPEFACES).map(([key, cfg]) => (
                      <button key={key}
                        className={`wex-chip${(ws.typeface === key) || (!ws.typeface && t.typeface === key) ? ' on' : ''}`}
                        onClick={() => updateWidgetSetting(mobileExpandId, 'typeface', ws.typeface === key ? undefined : key)}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Mobile arrange panel ──────────────────────────────── */}
      {isStacked && mobileEditMode && (
        <div className="arr-overlay">
          <div className="arr-panel">
            <div className="arr-bar">
              <span className="arr-label">ARRANGE WIDGETS</span>
              <button className="arr-done" onClick={() => { setMobileEditMode(false); setMobileDragId(null); setMobileSwapId(null); setMobilePreviewOrder(null); }}>
                DONE
              </button>
            </div>
            <div className="arr-grid">
              {((mobilePreviewOrder ?? mobileOrder).length > 0
                ? (mobilePreviewOrder ?? mobileOrder).map((id) => layout.find((i) => i.id === id)).filter(Boolean) as WidgetItem[]
                : [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
              ).map((item) => {
                const def = WIDGET_REGISTRY.find((w) => w.type === item.type);
                if (!def) return null;
                const span2 = item.w >= 4 || item.h >= 3;
                const isDragging = mobileDragId === item.id;
                const isTarget = mobileSwapId === item.id;
                return (
                  <div
                    key={item.id}
                    data-arr-id={item.id}
                    className={`arr-tile${span2 ? ' arr-span2' : ''}${isDragging ? ' arr-dragging' : ''}${isTarget ? ' arr-target' : ''}`}
                    onPointerDown={(e) => onArrPointerDown(e, item.id)}
                  >
                    <span className="arr-handle">⠿</span>
                    <span className="arr-name">{def.label}</span>
                    <span className="arr-size">{item.w}×{item.h}</span>
                    <button className="arr-remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeWidget(item.id)}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
