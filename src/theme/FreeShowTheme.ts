// FreeShow Theme System
export const FreeShowTheme = {
  colors: {
    // Primary colors (dark theme)
    primary: '#292c36',
    primaryLighter: '#363945',
    primaryDarker: '#191923',
    primaryDarkest: '#12121c',
    
    // Text colors
    text: '#f0f0ff',
    textInvert: '#131313',
    secondaryText: '#f0f0ff',
    textSecondary: '#a0a0b0',
    
    // Background colors
    background: '#191923',
    surface: '#292c36',
    
    // Border colors
    border: '#363945',
    
    // Accent colors
  secondary: '#f0008c', // FreeShow's signature pink/magenta
  // Variants for consistent usage (no hard-coded random purples elsewhere)
  secondaryLight: '#ff1e9d',
  secondaryDark: '#c80074',
  secondaryOpacity: 'rgba(240, 0, 140, 0.5)',
  secondarySurface: 'rgba(240, 0, 140, 0.16)',
    
    // Interactive states
    hover: 'rgb(255 255 255 / 0.05)',
    focus: 'rgb(255 255 255 / 0.1)',
    
    // Status colors
    connected: '#27a827',
    disconnected: '#a82727',
    
    // Utility
    transparent: '#232530',
  },
  
  gradients: {
    // Slide color gradients similar to FreeShow
    red: 'linear-gradient(120deg, #FF4136 0%, #C7002D 60%, #800020 100%)',
    orange: 'linear-gradient(120deg, #FF851B 0%, #E06A00 60%, #A34700 100%)',
    yellow: 'linear-gradient(120deg, #FFDC00 0%, #D4AF00 60%, #A18600 100%)',
    green: 'linear-gradient(120deg, #2ECC40 0%, #1F9E2E 60%, #156F20 100%)',
    teal: 'linear-gradient(120deg, #39CCCC 0%, #2CA0A0 60%, #1E7575 100%)',
    blue: 'linear-gradient(120deg, #0074D9 0%, #0051A3 60%, #00346C 100%)',
    purple: 'linear-gradient(120deg, #B10DC9 0%, #8A0AA4 60%, #5F0578 100%)',
    
    dark: ['#363945', '#292c36', '#191923'] as const,
    // App background gradient - used across all screens
    appBackground: ['#0a0a0f', '#0d0d15', '#0f0f18'] as const,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  
  fonts: {
    // React Native uses platform default fonts
    system: undefined, // Let React Native use default font
    mono: undefined, // Let React Native use default monospace font
  },
};
