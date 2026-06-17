import type { DreamModeId, HomeTabId } from './home';

export type RecordModeId = DreamModeId;

export type RecordModeOption = {
  id: RecordModeId;
  label: string;
  helperText: string;
  accessibilityLabel: string;
};

export type DreamKeyword = {
  id: string;
  label: string;
  isPrimary?: boolean;
};

export type DreamMoodId = string;

export type DreamMood = {
  id: DreamMoodId;
  label: string;
  faceColor: string;
  expression: string;
};

export type RecordFormState = {
  mode: RecordModeId;
  title: string;
  selectedKeywordIds: string[];
  selectedMoodIds: DreamMoodId[];
  memo: string;
};

export type RecordActionPayload = RecordFormState & {
  selectedKeywords: DreamKeyword[];
  selectedMoods: DreamMood[];
};

export type RecordTabHandler = (tabId: HomeTabId) => void;

export type SavedDream = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  mode: RecordModeId;
  selectedKeywordIds: string[];
  selectedMoodIds: string[];
  memo: string;
  createdAt: string;
  isFavorite?: boolean;
};
