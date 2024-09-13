import type { StyleProps } from '../commonTypes';
import type { CSSAnimationConfig } from './types';

type AnimationSettingProp = keyof Omit<CSSAnimationConfig, 'animationName'>;

const ANIMATION_SETTINGS: AnimationSettingProp[] = [
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
];

const ANIMATION_SETTINGS_SET = new Set<string>(ANIMATION_SETTINGS);

const isAnimationSetting = (key: string): key is AnimationSettingProp =>
  ANIMATION_SETTINGS_SET.has(key);

export function extractAnimationConfigAndFlattenedStyles(
  styles: StyleProps[]
): [CSSAnimationConfig | null, StyleProps] {
  const animationName = styles.reduceRight((acc, style) => {
    return acc || style?.animationName;
  }, undefined);

  if (!animationName) {
    return [null, {}];
  }

  const config: CSSAnimationConfig = { animationName };
  const flattenedStyle: StyleProps = {};

  for (const style of styles) {
    for (const prop in style) {
      if (prop === 'animationName') {
        continue;
      } else if (isAnimationSetting(prop)) {
        config[prop] = style[prop];

        // TODO: Maybe throw error or display a warning if the same property
        // is defined in more than one style object
      } else {
        flattenedStyle[prop] = style[prop];
      }
    }
  }

  return [config, flattenedStyle];
}
