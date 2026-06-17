export const colors = {
  // Brand colors
  primary: '#907eff',       // Primary buttons, active markers
  primaryLight: '#f5f2ff',  // Secondary background
  primaryBorder: '#ded7ff', // Border for secondary components
  accent: '#7b61ff',        // Text highlight, active elements
  accentLight: '#8c7eff',   // Pastel lavender accent (arrows, subtext)
  accentDark: '#7558f7',    // Selected indicators, calendar highlights

  // Text colors
  textPrimary: '#2d237a',   // Headers, main titles (navy/deep purple)
  textSecondary: '#6f6a78', // Unselected states, body text
  textMuted: '#8a82ad',     // Optional labels, sub-annotations
  textLight: '#ffffff',     // Text on dark backgrounds (buttons)
  textHelper: '#756fa5',    // Informative sub-texts
  textCount: '#8a7ef2',     // Count indicators (title/memo counts)

  // Input & UI colors
  bgWhite: '#ffffff',
  placeholder: '#c2bbdf',
  inputBorder: '#d9ccff',
  cardBorder: 'rgba(226, 218, 255, 0.72)',
  inputPlaceholder: '#8179a9',
  memoTitle: '#25218a',

  // Mood colors
  moodHappy: '#ffd66b',
  moodCalm: '#94ddd0',
  moodCurious: '#ffd56e',
  moodFear: '#ff8588',
  moodSad: '#9ec4f7',

  // System & Accent decorations
  starGold: '#ffd86a',
  weekendPink: '#c05282',

  // Shadows
  shadowPrimary: '#6f4be8',
  shadowSecondary: '#a69aff',
  shadowText: 'rgba(111, 75, 232, 0.1)',
};

export type ColorsType = typeof colors;
