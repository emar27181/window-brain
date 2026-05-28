type Palette = { t: number; c: string[] };

const PALETTES: Record<'dark' | 'light', Palette[]> = {
  dark: [
    { t: 0,  c: ['#070912', '#0c1326', '#1a2456', '#2d1840', '#0d2a3a'] },
    { t: 5,  c: ['#0a1018', '#181a2e', '#4a2a55', '#6b2e4a', '#1a3550'] },
    { t: 7,  c: ['#0e1318', '#2a1f24', '#a04a3e', '#3a3550', '#2a4a60'] },
    { t: 10, c: ['#0c1218', '#1b2230', '#2a4a78', '#3a5a90', '#1c3850'] },
    { t: 13, c: ['#0e1418', '#1c2530', '#2a5878', '#5a6890', '#2a4060'] },
    { t: 17, c: ['#100e15', '#2a1c25', '#b85a45', '#7a3a6a', '#2a3a70'] },
    { t: 19, c: ['#0c0c18', '#1f1830', '#6a2a6a', '#4a2a80', '#1a2050'] },
    { t: 22, c: ['#08090f', '#101428', '#1a3060', '#382060', '#0d2238'] },
  ],
  light: [
    { t: 0,  c: ['#e8e6f0', '#dcd9ea', '#b8b3e0', '#c4b5d8', '#a8b8d4'] },
    { t: 5,  c: ['#ece2e6', '#e2d2d8', '#d4a8b8', '#c8a8c0', '#b0b8d0'] },
    { t: 7,  c: ['#f4e4d2', '#f0d4b8', '#ffb89a', '#f4b0a0', '#e0c8e0'] },
    { t: 10, c: ['#ebeef2', '#dde6ee', '#c0d4e8', '#cad8e8', '#dce4ec'] },
    { t: 13, c: ['#eeece6', '#e6e6e0', '#d4dfee', '#dcdaea', '#d8e2e8'] },
    { t: 17, c: ['#f2dcc4', '#eec0a8', '#ff9e80', '#f09080', '#c0a8d8'] },
    { t: 19, c: ['#e0cad4', '#d4b8c8', '#c89ac4', '#b09cce', '#9aa8cc'] },
    { t: 22, c: ['#dad6e2', '#ccc8de', '#a8a4d8', '#b0a8d0', '#94a4c8'] },
  ],
};

const STATIC_BACKGROUNDS: Record<string, { dark: string[]; light: string[] }> = {
  midnight: {
    dark:  ['#06070d','#0c0e18','#1a2a55','#2a1840','#0d2030'],
    light: ['#dcdae8','#cccae0','#a8a4d8','#b0a8d0','#94a4c8'],
  },
  sunset: {
    dark:  ['#100c14','#291822','#c85a3a','#7a2e6a','#3a2870'],
    light: ['#f4dac0','#eebca0','#ff9e7a','#ec8a90','#b8a8d0'],
  },
  aurora: {
    dark:  ['#06090f','#0a1420','#1a5566','#2a3a78','#4a2a60'],
    light: ['#e0eae8','#cce0dc','#a4d4cc','#b0c8e0','#c8b8d8'],
  },
  paper: {
    dark:  ['#1a1b1f','#222328','#34384a','#3a3a4a','#2a2c38'],
    light: ['#efeae0','#e5dfd2','#d8c8b0','#c8c0b8','#dad5cc'],
  },
};

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function hexToRgb(h: string): [number, number, number] {
  const x = h.replace('#', '');
  return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
}
function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0],B[0],t), lerp(A[1],B[1],t), lerp(A[2],B[2],t));
}

export function paletteAt(mode: 'dark' | 'light', hour: number): string[] {
  const list = PALETTES[mode];
  let i = 0;
  for (let k = 0; k < list.length; k++) {
    if (list[k].t <= hour) i = k;
  }
  const a = list[i];
  const b = list[(i + 1) % list.length];
  const tEnd = b.t > a.t ? b.t : b.t + 24;
  const tt = Math.max(0, Math.min(1, (hour - a.t) / (tEnd - a.t)));
  return a.c.map((c, n) => mixHex(c, b.c[n], tt));
}

export function getBackgroundColors(bgKind: string, dark: boolean, hour: number): string[] {
  const mode: 'dark' | 'light' = dark ? 'dark' : 'light';
  if (bgKind === 'time') return paletteAt(mode, hour);
  const preset = STATIC_BACKGROUNDS[bgKind] ?? STATIC_BACKGROUNDS.midnight;
  return preset[mode] ?? preset.dark;
}
