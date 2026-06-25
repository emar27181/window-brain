import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

const STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(22,25,33,.92);color:#e8e9ee;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.1);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 12px 40px rgba(0,0,0,.35);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  body.theme-light .twk-panel{background:rgba(250,249,247,.88);color:#29261b;
    border:.5px solid rgba(255,255,255,.6);
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18)}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:var(--ink-faint);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:var(--chip);color:inherit}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:var(--rule-strong) transparent}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:var(--ink-mute)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:var(--ink-faint);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:var(--track);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.18);box-shadow:0 1px 2px rgba(0,0,0,.2);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  body.theme-light .twk-seg-thumb{background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12)}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:var(--track);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(255,255,255,.9);color:#0a0d14;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:#fff}
  body.theme-light .twk-btn{background:rgba(0,0,0,.78);color:#fff}
  body.theme-light .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:var(--chip);color:inherit}
  .twk-btn.secondary:hover{background:var(--chip-hover)}
  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(255,255,255,.12);border-radius:7px;
    background:rgba(255,255,255,.06);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.1)}
  body.theme-light .twk-field{border:.5px solid rgba(0,0,0,.1);background:rgba(255,255,255,.6)}
  body.theme-light .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(255,255,255,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}
  body.theme-light select.twk-field{
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>")}
`;

// ─── TweaksPanel ──────────────────────────────────────────────────

interface TweaksPanelProps {
  title?: string;
  children?: ReactNode;
  /** 外部からパネルを開くための制御 */
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export function TweaksPanel({ title = 'Tweaks', children, externalOpen, onExternalClose }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);

  // 外部からの開閉に追随
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    onExternalClose?.();
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;

  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={dragRef}
        className="twk-panel"
        style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
      >
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button
            className="twk-x"
            aria-label="Close tweaks"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={dismiss}
          >
            ✕
          </button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

// ─── Control helpers ──────────────────────────────────────────────

export function TweakSection({ label }: { label: string }) {
  return <div className="twk-sect">{label}</div>;
}

export function TweakToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? '1' : '0'}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}

type RadioOption = string | number | { value: string | number; label: string };

export function TweakRadio({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: RadioOption[];
  onChange: (v: string | number) => void;
}) {
  const opts = options.map((o) =>
    typeof o === 'object' ? o : { value: o, label: String(o) }
  );
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div className="twk-seg" role="radiogroup">
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {opts.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TweakSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: RadioOption[];
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <select
        className="twk-field"
        value={String(value)}
        onChange={(e) => {
          const opt = options.find(
            (o) => String(typeof o === 'object' ? o.value : o) === e.target.value
          );
          if (opt !== undefined) {
            onChange(typeof opt === 'object' ? opt.value : opt);
          }
        }}
      >
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : String(o);
          return <option key={String(v)} value={String(v)}>{l}</option>;
        })}
      </select>
    </div>
  );
}

export function TweakButton({
  label,
  onClick,
  secondary = false,
}: {
  label: string;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      className={secondary ? 'twk-btn secondary' : 'twk-btn'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function TweakColor({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options?: string[];
  onChange: (v: string) => void;
}) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input
          type="color"
          value={value}
          style={{ width: 56, height: 22, border: '.5px solid rgba(0,0,0,.1)', borderRadius: 6, padding: 0 }}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(o)}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: o,
              border: value.toLowerCase() === o.toLowerCase()
                ? '2px solid currentColor' : '.5px solid rgba(0,0,0,.15)',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
