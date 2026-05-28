import type { WidgetDef, AllowedSize } from '../../types';
import { ClockWidget } from './ClockWidget';
import { WeatherWidget } from './WeatherWidget';
import { TodoWidget } from './TodoWidget';
import { CalendarWidget } from './CalendarWidget';
import { NotesWidget } from './NotesWidget';
import { TokensWidget } from './TokensWidget';
import { YouTubeWidget } from './YouTubeWidget';
import { NowPlayingWidget } from './NowPlayingWidget';
import { MarketsWidget } from './MarketsWidget';
import { PomodoroWidget } from './PomodoroWidget';
import { GithubWidget } from './GithubWidget';
import { SystemWidget } from './SystemWidget';

export const WIDGET_REGISTRY: WidgetDef[] = [
  { type: 'clock',    label: '時計',       Component: ClockWidget,      defaultSize: { w: 2, h: 2 } },
  { type: 'weather',  label: '天気',       Component: WeatherWidget,    defaultSize: { w: 2, h: 2 } },
  { type: 'calendar', label: 'カレンダー', Component: CalendarWidget,   defaultSize: { w: 3, h: 2 } },
  { type: 'todo',     label: 'タスク',     Component: TodoWidget,       defaultSize: { w: 3, h: 2 } },
  { type: 'notes',    label: 'メモ',       Component: NotesWidget,      defaultSize: { w: 3, h: 2 } },
  { type: 'tokens',   label: 'AI 利用量',  Component: TokensWidget,     defaultSize: { w: 2, h: 2 } },
  { type: 'youtube',  label: 'ライブ配信', Component: YouTubeWidget,    defaultSize: { w: 4, h: 2 } },
  { type: 'music',    label: 'Now Playing',Component: NowPlayingWidget, defaultSize: { w: 4, h: 2 } },
  { type: 'markets',  label: 'マーケット', Component: MarketsWidget,    defaultSize: { w: 3, h: 2 } },
  { type: 'pomodoro', label: 'ポモドーロ', Component: PomodoroWidget,   defaultSize: { w: 2, h: 2 } },
  { type: 'github',   label: 'コミット',   Component: GithubWidget,     defaultSize: { w: 4, h: 2 } },
  { type: 'system',   label: 'システム',   Component: SystemWidget,     defaultSize: { w: 3, h: 2 } },
];

export const ALLOWED_SIZES: AllowedSize[] = [
  { w: 1, h: 1 }, { w: 2, h: 1 }, { w: 2, h: 2 }, { w: 3, h: 2 },
  { w: 4, h: 2 }, { w: 4, h: 3 }, { w: 4, h: 4 },
];

export {
  ClockWidget, WeatherWidget, TodoWidget, CalendarWidget, NotesWidget,
  TokensWidget, YouTubeWidget, NowPlayingWidget, MarketsWidget,
  PomodoroWidget, GithubWidget, SystemWidget,
};
