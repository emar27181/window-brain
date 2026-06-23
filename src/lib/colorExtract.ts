export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const S = 48;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, S, S);
        const { data } = ctx.getImageData(0, 0, S, S);
        let bestScore = 0, bestR = 0, bestG = 0, bestB = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = max / 255;
          // Favor vivid colors at mid-brightness (not too dark/bright)
          const score = sat * (1 - Math.abs(lum - 0.6));
          if (score > bestScore) { bestScore = score; bestR = r; bestG = g; bestB = b; }
        }
        resolve(bestScore > 0.12 ? `rgb(${bestR},${bestG},${bestB})` : null);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export function dispatchLiveColor(color: string | null) {
  window.dispatchEvent(new CustomEvent<{ color: string | null }>('wb:live-color', { detail: { color } }));
}
