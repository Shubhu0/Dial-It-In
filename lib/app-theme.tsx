import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppTheme = 'light' | 'sepia' | 'dark'

// Direction A color variants from tokens.md
export const THEME_COLORS: Record<AppTheme, {
  bgPrimary:     string
  bgSecondary:   string
  surface:       string
  textPrimary:   string
  textSecondary: string
  textTertiary:  string
  divider:       string
  dividerSoft:   string
  accent:        string
  accentDark:    string
}> = {
  light: {
    bgPrimary:     '#F3EBD9',
    bgSecondary:   '#EBE0C8',
    surface:       '#EBE0C8',
    textPrimary:   '#2A211A',
    textSecondary: '#4A3B2E',
    textTertiary:  '#7A6753',
    divider:       '#D9CCAE',
    dividerSoft:   '#E4D9BF',
    accent:        '#A84A1F',
    accentDark:    '#7A3515',
  },
  sepia: {
    bgPrimary:     '#EDE0C4',
    bgSecondary:   '#E3D4B2',
    surface:       '#E3D4B2',
    textPrimary:   '#3A2A1A',
    textSecondary: '#5A4530',
    textTertiary:  '#8A7560',
    divider:       '#CFBD96',
    dividerSoft:   '#D9C9A8',
    accent:        '#A84A1F',
    accentDark:    '#7A3515',
  },
  dark: {
    bgPrimary:     '#1A140E',
    bgSecondary:   '#221A12',
    surface:       '#221A12',
    textPrimary:   '#ECE1CD',
    textSecondary: '#C9BA9E',
    textTertiary:  '#95856B',
    divider:       '#3A2E1F',
    dividerSoft:   '#2A2116',
    accent:        '#E07A4A',
    accentDark:    '#F09467',
  },
}

interface ThemeCtx {
  appTheme:    AppTheme
  setAppTheme: (t: AppTheme) => void
  colors:      typeof THEME_COLORS['light']
}

const ThemeContext = createContext<ThemeCtx>({
  appTheme:    'light',
  setAppTheme: () => {},
  colors:      THEME_COLORS.light,
})

const THEME_KEY = 'app_theme_v1'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appTheme, setThemeState] = useState<AppTheme>('light')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'sepia' || saved === 'dark') {
        setThemeState(saved)
      }
    })
  }, [])

  function setAppTheme(t: AppTheme) {
    setThemeState(t)
    AsyncStorage.setItem(THEME_KEY, t)
  }

  return (
    <ThemeContext.Provider value={{ appTheme, setAppTheme, colors: THEME_COLORS[appTheme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
