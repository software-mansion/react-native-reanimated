import type { CSSAnimationConfig } from 'react-native-reanimated';

const formatAnimationValue = <K extends keyof CSSAnimationConfig>(
  key: K,
  value: CSSAnimationConfig[K]
): string => {
  switch (key) {
    case 'animationTimingFunction':
      if (typeof value !== 'string') {
        return value!.toString();
      }
    // don't break
    // eslint-disable-next-line no-fallthrough
    default:
      return JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
  }
};

export const formatAnimationCode = (
  animation: Partial<CSSAnimationConfig>
): string =>
  `{\n${Object.entries(animation)
    .map(
      ([key, value]) =>
        `  ${key}: ${formatAnimationValue(
          key as keyof CSSAnimationConfig,
          value
        )}`
    )
    .join(',\n')}\n}`;
