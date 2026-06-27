import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scaleFontSize,
  textSizeScales,
  type TextSizePreference,
} from '../theme/typography';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => Promise<void>;
  textSize: TextSizePreference;
  fontScale: number;
  setTextSize: (size: TextSizePreference) => Promise<void>;
  scaledFontSize: (size: number) => number;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: async () => {},
  textSize: 'default',
  fontScale: textSizeScales.default,
  setTextSize: async () => {},
  scaledFontSize: (size) => size,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [textSize, setTextSizeState] = useState<TextSizePreference>('default');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedTextSize = await AsyncStorage.getItem('@dreamlog_text_size');
        setIsDark(false);
        if (storedTextSize && storedTextSize in textSizeScales) {
          setTextSizeState(storedTextSize as TextSizePreference);
        }
      } catch (e) {
        console.error('Failed to load display preferences from storage:', e);
      }
    };
    loadPreferences();
  }, []);

  const toggleTheme = useCallback(async () => {
    setIsDark(false);
    try {
      await AsyncStorage.setItem('@dreamlog_theme', 'light');
    } catch (e) {
      console.error('Failed to save theme to storage:', e);
    }
  }, []);

  const setTextSize = useCallback(async (size: TextSizePreference) => {
    setTextSizeState(size);
    try {
      await AsyncStorage.setItem('@dreamlog_text_size', size);
    } catch (e) {
      console.error('Failed to save text size to storage:', e);
    }
  }, []);

  const fontScale = textSizeScales[textSize];
  const scaledFontSize = useCallback(
    (size: number) => scaleFontSize(size, fontScale),
    [fontScale],
  );
  const value = useMemo(
    () => ({
      isDark,
      toggleTheme,
      textSize,
      fontScale,
      setTextSize,
      scaledFontSize,
    }),
    [fontScale, isDark, scaledFontSize, setTextSize, textSize, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export type { TextSizePreference };
