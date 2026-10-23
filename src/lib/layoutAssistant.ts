import type { WidgetItem } from '../types';
import { collides, findFreeSlot } from './layout';

interface LayoutRequest {
  type: string;
  count: number;
  w: number;
  h: number;
}

export interface LayoutProposal {
  layout: WidgetItem[];
  summary: string[];
  unsupported: boolean;
}

const REQUESTS: Array<{ type: string; terms: string[]; size: { w: number; h: number }; label: string }> = [
  { type: 'rss', terms: ['ニュース', 'rss', 'news'], size: { w: 3, h: 2 }, label: 'ニュース' },
  { type: 'music', terms: ['音楽', 'music', 'spotify', 'playlist', 'プレイリスト'], size: { w: 4, h: 2 }, label: '音楽' },
  { type: 'youtube', terms: ['配信', 'ゲーム', 'twitch', 'youtube', '動画', 'stream'], size: { w: 4, h: 3 }, label: '動画・配信' },
  { type: 'todo', terms: ['todo', 'タスク'], size: { w: 3, h: 2 }, label: 'タスク' },
  { type: 'calendar', terms: ['予定', 'カレンダー', 'calendar'], size: { w: 3, h: 2 }, label: 'カレンダー' },
  { type: 'weather', terms: ['天気', 'weather'], size: { w: 2, h: 2 }, label: '天気' },
  { type: 'clock', terms: ['時計', 'clock'], size: { w: 2, h: 2 }, label: '時計' },
];

function requestedCount(prompt: string, terms: string[]): number {
  const index = terms.map((term) => prompt.toLowerCase().indexOf(term.toLowerCase())).filter((value) => value >= 0).sort((a, b) => a - b)[0];
  if (index === undefined) return 0;
  const tail = prompt.slice(index, index + 24);
  const digits = tail.match(/(?:\s|を|が|は)?(\d+)\s*(?:つ|個|枠|画面|面)/) ?? prompt.slice(Math.max(0, index - 16), index).match(/(\d+)\s*(?:つ|個|枠|画面|面)?(?:の)?\s*$/);
  if (digits) return Math.max(1, Math.min(6, Number(digits[1])));
  const japanese = tail.match(/(二|三|四|五|六)\s*(?:つ|個|枠|画面|面)/);
  const map: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  return japanese ? map[japanese[1]] : 1;
}

export function proposeLayoutFromInstruction(prompt: string): LayoutProposal {
  const requests: LayoutRequest[] = REQUESTS.flatMap((entry) => {
    const count = requestedCount(prompt, entry.terms);
    return count ? [{ type: entry.type, count, w: entry.size.w, h: entry.size.h }] : [];
  });
  if (!requests.length) return { layout: [], summary: [], unsupported: true };

  const layout: WidgetItem[] = [];
  const summary: string[] = [];
  let serial = Date.now();
  for (const request of requests) {
    for (let index = 0; index < request.count && layout.length < 8; index++) {
      const slot = findFreeSlot(layout, request.w, request.h);
      if (collides(layout, null, slot.x, slot.y, request.w, request.h)) break;
      layout.push({ id: 'ai-' + request.type + '-' + (++serial), type: request.type, x: slot.x, y: slot.y, w: request.w, h: request.h });
    }
    const count = layout.filter((item) => item.type === request.type).length;
    if (count) summary.push((REQUESTS.find((entry) => entry.type === request.type)?.label ?? request.type) + ' × ' + count);
  }

  return { layout, summary, unsupported: layout.length === 0 };
}
