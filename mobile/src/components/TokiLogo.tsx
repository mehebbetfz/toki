import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/** Логотип Toki — только SVG. */
export function TokiLogo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="30" fill={colors.surface} stroke={colors.accent} strokeWidth="2" />
      <Path
        d="M20 38c4-10 20-10 24 0M26 28h2M36 28h2"
        stroke={colors.text}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M32 18v8M28 22h8"
        stroke={colors.accent}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
