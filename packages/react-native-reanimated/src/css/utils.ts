import type { StyleProps } from '../commonTypes';
import type { CSSAnimationConfig } from './types';

const ANIMATION_SETTINGS: (keyof Omit<CSSAnimationConfig, 'animationName'>)[] =
  [
    'animationDuration',
    'animationTimingFunction',
    'animationDelay',
    'animationIterationCount',
    'animationDirection',
  ];

export function buildCSSAnimationConfigFromStyles(
  styles: StyleProps[]
): CSSAnimationConfig | null {
  const animationName = styles.reduceRight((acc, style) => {
    return acc || style?.animationName;
  }, undefined);

  if (!animationName) {
    return null;
  }

  const config: CSSAnimationConfig = { animationName };

  for (const style of styles) {
    for (const prop of ANIMATION_SETTINGS) {
      if (style[prop] !== undefined) {
        config[prop] = style[prop];

        // TODO: Maybe throw error or display a warning if the same property
        // is defined in more than one style object
      }
    }
  }

  return config;
}
