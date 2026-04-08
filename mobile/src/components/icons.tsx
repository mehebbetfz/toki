import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type ThemeIconProps = { size?: number; color?: string };

/** Универсальные SVG-иконки в стиле приложения (белый/оранжевый). */
export function IconMapPin({ size = 22, color = colors.accent }: ThemeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-3.5 7-9a7 7 0 1 0-14 0c0 5.5 7 9 7 9z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="2.2" fill={color} />
    </Svg>
  );
}

export function IconChatBubble({ size = 22, color = colors.accent }: ThemeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPhone({ size = 22, color = colors.accent }: ThemeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.71.54 2.54a2 2 0 0 1-.48 1.94l-1.25 1.25a16 16 0 0 0 6 6l1.25-1.25a2 2 0 0 1 1.94-.48c.83.24 1.68.42 2.54.54A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconGift({ size = 22, color = colors.accent }: ThemeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="10" width="18" height="11" rx="2" stroke={color} strokeWidth={1.65} />
      <Path d="M12 10v11M3 14h18M9 10c0-2 1.8-4 3-4s3 2 3 4" stroke={color} strokeWidth={1.65} strokeLinecap="round" />
    </Svg>
  );
}
