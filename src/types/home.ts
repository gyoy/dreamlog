export type DesignRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HomeTabId = 'home' | 'record' | 'archive' | 'stats' | 'more';

export type DreamModeId = 'planet' | 'constellation';

export type DreamTag = {
  id: string;
  label: string;
};

export type RecentDream = {
  id: string;
  title: string;
  dateLabel: string;
  tags: DreamTag[];
  isFavorite: boolean;
  date?: string;
  mode?: DreamModeId;
};

export type MonthlyDreamSummary = {
  currentCount: number;
  previousMonthDelta: number;
};

export type HomeRecordCta = {
  title: string;
  description: string;
  buttonLabel: string;
  accessibilityLabel: string;
};

export type HomeTypographySettings = {
  fontScale: number;
};

export type HomeTabItem = {
  id: HomeTabId;
  label: string;
};

export type HomeDreamMode = {
  id: DreamModeId;
  title: string;
  description: string;
  ctaLabel: string;
};

export type HomeData = {
  userName: string;
  greeting: string;
  prompt: string;
  notificationCount: number;
  recordCta: HomeRecordCta;
  typographySettings?: HomeTypographySettings;
  monthlySummary: MonthlyDreamSummary;
  dreamModes: HomeDreamMode[];
  recentDreams: RecentDream[];
  tabs: HomeTabItem[];
};
