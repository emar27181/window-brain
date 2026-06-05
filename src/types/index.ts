export interface WidgetItem {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface TweakValues {
  dark: boolean;
  background: string;
  accent: string;
  density: string;
  typeface: string;
  displayFont: string;
  weight: number;
}

export interface AccentConfig {
  color: string;
  label: string;
  palette: string[];
}

export interface TypefaceConfig {
  label: string;
  sans: string;
  mono: string;
}

export interface DisplayFontConfig {
  label: string;
  css: string;
}

export interface BgOption {
  id: string;
  label: string;
}

export interface WidgetDef {
  type: string;
  label: string;
  Component: React.ComponentType<{ size: Size; widgetId?: string }>;
  defaultSize: Size;
}

export interface AllowedSize {
  w: number;
  h: number;
}

export interface DragState {
  id: string;
  gx: number;
  gy: number;
  w: number;
  h: number;
  preview: WidgetItem[];
  valid: boolean;
}

export interface ResizeState {
  id: string;
  w: number;
  h: number;
}

export interface WidgetSettings {
  accent?: string;
  typeface?: string;
}
