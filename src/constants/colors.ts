export const Colors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#0F0F23',
  surface: '#1A1A3E',
  surfaceAlt: '#252550',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  border: '#334155',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

export type ColorKey = keyof typeof Colors;
