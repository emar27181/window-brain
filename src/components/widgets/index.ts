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
import { CountdownWidget } from './CountdownWidget';
import { HabitWidget } from './HabitWidget';
import { MoodWidget } from './MoodWidget';
import { BooksWidget } from './BooksWidget';
import { WorkoutWidget } from './WorkoutWidget';
import { ForexWidget } from './ForexWidget';
import { RssWidget } from './RssWidget';
import { StickyWidget } from './StickyWidget';
import { FocusWidget } from './FocusWidget';
import { DayCalendarWidget } from './DayCalendarWidget';
import { TimerWidget } from './TimerWidget';
import { AlarmWidget } from './AlarmWidget';
import { GithubPetWidget } from './GithubPetWidget';

export const WIDGET_REGISTRY: WidgetDef[] = [
  { type: 'clock',     label: '時計',         Component: ClockWidget,      defaultSize: { w: 2, h: 2 } },
  { type: 'weather',   label: '天気',         Component: WeatherWidget,    defaultSize: { w: 2, h: 2 } },
  { type: 'calendar',  label: 'カレンダー',   Component: CalendarWidget,   defaultSize: { w: 3, h: 2 } },
  { type: 'todo',      label: 'タスク',       Component: TodoWidget,       defaultSize: { w: 3, h: 2 } },
  { type: 'notes',     label: 'メモ',         Component: NotesWidget,      defaultSize: { w: 3, h: 2 } },
  { type: 'tokens',    label: 'AI 利用量',    Component: TokensWidget,     defaultSize: { w: 2, h: 2 } },
  { type: 'youtube',   label: 'ライブ配信',   Component: YouTubeWidget,    defaultSize: { w: 4, h: 2 } },
  { type: 'music',     label: 'Now Playing',  Component: NowPlayingWidget, defaultSize: { w: 4, h: 2 } },
  { type: 'markets',   label: 'マーケット',   Component: MarketsWidget,    defaultSize: { w: 3, h: 2 } },
  { type: 'pomodoro',  label: 'ポモドーロ',   Component: PomodoroWidget,   defaultSize: { w: 2, h: 2 } },
  { type: 'github',    label: 'コミット',     Component: GithubWidget,     defaultSize: { w: 4, h: 2 } },
  { type: 'system',    label: 'システム',     Component: SystemWidget,     defaultSize: { w: 3, h: 2 } },
  { type: 'countdown', label: 'カウントダウン', Component: CountdownWidget, defaultSize: { w: 3, h: 2 } },
  { type: 'habit',     label: '習慣トラッカー', Component: HabitWidget,    defaultSize: { w: 3, h: 2 } },
  { type: 'mood',      label: '気分記録',     Component: MoodWidget,       defaultSize: { w: 2, h: 2 } },
  { type: 'books',     label: '読書リスト',   Component: BooksWidget,      defaultSize: { w: 3, h: 2 } },
  { type: 'workout',   label: '運動記録',     Component: WorkoutWidget,    defaultSize: { w: 3, h: 2 } },
  { type: 'forex',     label: '為替レート',   Component: ForexWidget,      defaultSize: { w: 2, h: 2 } },
  { type: 'rss',       label: 'RSS',          Component: RssWidget,        defaultSize: { w: 3, h: 2 } },
  { type: 'sticky',    label: '付箋',         Component: StickyWidget,     defaultSize: { w: 2, h: 2 } },
  { type: 'focus',     label: '集中タイマー', Component: FocusWidget,      defaultSize: { w: 2, h: 2 } },
  { type: 'daycal',   label: '一日カレンダー', Component: DayCalendarWidget, defaultSize: { w: 2, h: 4 } },
  { type: 'timer',    label: 'タイマー',       Component: TimerWidget,       defaultSize: { w: 2, h: 2 } },
  { type: 'alarm',    label: 'アラーム',       Component: AlarmWidget,       defaultSize: { w: 2, h: 2 } },
  { type: 'ghpet',   label: 'GitHub ペット',  Component: GithubPetWidget,   defaultSize: { w: 2, h: 3 } },
];

// 全幅(1〜13) × 全高(1〜6) の任意サイズを許可
export const ALLOWED_SIZES: AllowedSize[] = (() => {
  const sizes: AllowedSize[] = [];
  for (let h = 1; h <= 6; h++)
    for (let w = 1; w <= 13; w++)
      sizes.push({ w, h });
  return sizes;
})();

export {
  ClockWidget, WeatherWidget, TodoWidget, CalendarWidget, NotesWidget,
  TokensWidget, YouTubeWidget, NowPlayingWidget, MarketsWidget,
  PomodoroWidget, GithubWidget, SystemWidget,
  CountdownWidget, HabitWidget, MoodWidget, BooksWidget, WorkoutWidget,
  ForexWidget, RssWidget, StickyWidget, FocusWidget, DayCalendarWidget,
  TimerWidget, AlarmWidget, GithubPetWidget,
};
