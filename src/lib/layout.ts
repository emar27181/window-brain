import type { WidgetItem } from '../types';

export const COLS = 13;
export const ROWS = 6;

export function collides(
  layout: WidgetItem[],
  ignoreId: string | null,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (x < 1 || y < 1 || x + w - 1 > COLS || y + h - 1 > ROWS) return true;
  return layout.some((it) => {
    if (it.id === ignoreId) return false;
    return !(x + w <= it.x || it.x + it.w <= x || y + h <= it.y || it.y + it.h <= y);
  });
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function reflowLayout(
  layout: WidgetItem[],
  draggedId: string,
  dx: number,
  dy: number,
  prevPositions?: Map<string, { x: number; y: number }>
): { layout: WidgetItem[]; valid: boolean } {
  const dragged = layout.find((i) => i.id === draggedId);
  if (!dragged) return { layout, valid: false };
  if (dx < 1 || dy < 1 || dx + dragged.w - 1 > COLS || dy + dragged.h - 1 > ROWS) {
    return { layout, valid: false };
  }

  const newDragged = { ...dragged, x: dx, y: dy };
  const vacated = { x: dragged.x, y: dragged.y, w: dragged.w, h: dragged.h };

  type WorkItem = WidgetItem & { _origX: number; _origY: number; _prevX: number; _prevY: number };

  const others: WorkItem[] = layout
    .filter((i) => i.id !== draggedId)
    .map((i) => {
      const prev = prevPositions?.get(i.id);
      return {
        ...i,
        _origX: i.x,
        _origY: i.y,
        _prevX: prev ? prev.x : i.x,
        _prevY: prev ? prev.y : i.y,
      };
    });

  const stable: WorkItem[] = [];
  const displaced: WorkItem[] = [];
  for (const item of others) {
    if (rectsOverlap(item, newDragged)) displaced.push(item);
    else stable.push(item);
  }

  const stripWork = ({ _origX: _, _origY: __, _prevX: ___, _prevY: ____, ...rest }: WorkItem): WidgetItem => rest;

  // Fast path: single same-size collision → straight swap
  if (
    displaced.length === 1 &&
    displaced[0].w === dragged.w &&
    displaced[0].h === dragged.h
  ) {
    const swapped = { ...displaced[0], x: vacated.x, y: vacated.y };
    return {
      layout: [newDragged, ...stable.map(stripWork), stripWork(swapped)],
      valid: true,
    };
  }

  // General path: pack displaced widgets into best free slots
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [
    newDragged,
    ...stable,
  ];
  displaced.sort((a, b) => b.w * b.h - a.w * a.h);

  for (const item of displaced) {
    let best: { x: number; y: number } | null = null;
    let bestScore = Infinity;
    for (let y = 1; y <= ROWS - item.h + 1; y++) {
      for (let x = 1; x <= COLS - item.w + 1; x++) {
        const cand = { x, y, w: item.w, h: item.h };
        if (placed.some((p) => rectsOverlap(cand, p))) continue;
        const dOrig = Math.abs(x - item._origX) + Math.abs(y - item._origY);
        const dPrev = Math.abs(x - item._prevX) + Math.abs(y - item._prevY);
        const dVacated = Math.abs(x - vacated.x) + Math.abs(y - vacated.y);
        const score = dOrig * 12 + dVacated * 4 + dPrev;
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
    }
    if (!best) return { layout, valid: false };
    item.x = best.x;
    item.y = best.y;
    placed.push(item);
  }

  return {
    layout: [newDragged, ...stable.map(stripWork), ...displaced.map(stripWork)],
    valid: true,
  };
}

export function findFreeSlot(
  layout: WidgetItem[],
  w: number,
  h: number
): { x: number; y: number } {
  for (let y = 1; y <= ROWS - h + 1; y++) {
    for (let x = 1; x <= COLS - w + 1; x++) {
      if (!collides(layout, null, x, y, w, h)) return { x, y };
    }
  }
  return { x: 1, y: 1 };
}
