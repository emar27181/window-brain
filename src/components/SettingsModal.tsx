import { useEffect, type ReactNode } from 'react';
import type { TweakValues, AccentConfig, TypefaceConfig, DisplayFontConfig, BgOption } from '../types';

// ─── Sub-components ──────────────────────────────────────────────

function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="s-row">
      <div className="s-row-label">
        <div className="s-row-name">{label}</div>
        {hint && <div className="s-row-hint">{hint}</div>}
      </div>
      <div className="s-row-control">{children}</div>
    </div>
  );
}

function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="s-section">
      <div className="s-section-label">{label}</div>
      <div className="s-section-rows">{children}</div>
    </section>
  );
}

type SegOption = string | number | { value: string | number; label: string };

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string | number;
  options: SegOption[];
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="s-seg">
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : String(o);
        return (
          <button
            key={String(v)}
            type="button"
            className={`s-seg-btn ${value === v ? 'active' : ''}`}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SwatchPills({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; preview?: React.CSSProperties }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="s-pills">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`s-pill ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.preview && <span className="s-pill-preview" style={o.preview}></span>}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function ColorSwatches({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; color: string; palette?: string[] }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="s-swatches">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`s-swatch ${value === o.value ? 'active' : ''}`}
          title={o.label}
          onClick={() => onChange(o.value)}
        >
          <span
            className="s-swatch-color"
            style={{
              background: `linear-gradient(135deg, ${o.palette ? o.palette.join(', ') : o.color})`,
            }}
          ></span>
          <span className="s-swatch-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

const BG_PREVIEWS: Record<string, React.CSSProperties> = {
  time:     { background: 'linear-gradient(135deg, #0a0d14 0%, #25334a 50%, #ff9a6c 100%)' },
  midnight: { background: 'linear-gradient(135deg, #050810 0%, #1a2238 100%)' },
  sunset:   { background: 'linear-gradient(135deg, #3a1a2e 0%, #ff6e8a 60%, #ffcb6c 100%)' },
  aurora:   { background: 'linear-gradient(135deg, #0a1426 0%, #67f4d6 50%, #9aa6ff 100%)' },
  paper:    { background: 'linear-gradient(135deg, #eceae4 0%, #d8d4ca 100%)' },
};

// ─── Main component ──────────────────────────────────────────────

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  t: TweakValues;
  setTweak: (key: keyof TweakValues | Partial<TweakValues>, val?: TweakValues[keyof TweakValues]) => void;
  ACCENTS: Record<string, AccentConfig>;
  BG_OPTIONS: BgOption[];
  TYPEFACES: Record<string, TypefaceConfig>;
  DISPLAY_FONTS: Record<string, DisplayFontConfig>;
  layoutCount: number;
  onResetLayout: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsModal({
  open,
  onClose,
  t,
  setTweak,
  ACCENTS,
  BG_OPTIONS,
  TYPEFACES,
  DISPLAY_FONTS,
  layoutCount,
  onResetLayout,
  onExport,
  onImport,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="picker-bd" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings-hd">
          <div>
            <div className="settings-title">設定</div>
            <div className="settings-sub">SETTINGS</div>
          </div>
          <button className="x" onClick={onClose}>CLOSE ✕</button>
        </div>

        <div className="settings-body">
          <SettingsSection label="表示 / APPEARANCE">
            <SettingsRow label="テーマ" hint="ダークまたはライト">
              <Segmented
                value={t.dark ? 'dark' : 'light'}
                options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
                onChange={(v) => setTweak('dark', v === 'dark')}
              />
            </SettingsRow>
            <SettingsRow label="密度" hint="ウィジェット間の余白">
              <Segmented
                value={t.density}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'regular', label: 'Regular' },
                  { value: 'cozy', label: 'Cozy' },
                ]}
                onChange={(v) => setTweak('density', v)}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="背景 / BACKGROUND">
            <SwatchPills
              value={t.background}
              options={BG_OPTIONS.map((o) => ({ value: o.id, label: o.label, preview: BG_PREVIEWS[o.id] }))}
              onChange={(v) => setTweak('background', v)}
            />
          </SettingsSection>

          <SettingsSection label="アクセント / ACCENT">
            <ColorSwatches
              value={t.accent}
              options={Object.entries(ACCENTS).map(([k, a]) => ({
                value: k,
                label: a.label,
                color: a.color,
                palette: a.palette,
              }))}
              onChange={(v) => setTweak('accent', v)}
            />
          </SettingsSection>

          <SettingsSection label="タイポグラフィ / TYPOGRAPHY">
            <SettingsRow label="書体" hint="本文と等幅">
              <Segmented
                value={t.typeface}
                options={Object.entries(TYPEFACES).map(([k, f]) => ({ value: k, label: f.label }))}
                onChange={(v) => setTweak('typeface', v)}
              />
            </SettingsRow>
            <SettingsRow label="ディスプレイ" hint="時計などの装飾文字">
              <Segmented
                value={t.displayFont}
                options={Object.entries(DISPLAY_FONTS).map(([k, f]) => ({ value: k, label: f.label }))}
                onChange={(v) => setTweak('displayFont', v)}
              />
            </SettingsRow>
            <SettingsRow label="ウェイト" hint="本文の太さ">
              <Segmented
                value={t.weight}
                options={[
                  { value: 300, label: 'Light' },
                  { value: 400, label: 'Regular' },
                  { value: 500, label: 'Medium' },
                ]}
                onChange={(v) => setTweak('weight', v as number)}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="レイアウト / LAYOUT">
            <SettingsRow label="ウィジェット" hint={`現在 ${layoutCount} 個のウィジェット`}>
              <button className="s-btn" onClick={onResetLayout}>デフォルトに戻す</button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="データ / DATA">
            <SettingsRow label="エクスポート" hint="レイアウト・タスク・メモをJSONで書き出し">
              <button className="s-btn" onClick={onExport}>JSONを書き出す</button>
            </SettingsRow>
            <SettingsRow label="インポート" hint="JSONファイルから復元">
              <button className="s-btn" onClick={onImport}>JSONを読み込む</button>
            </SettingsRow>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
