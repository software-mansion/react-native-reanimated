import { processCSSAnimationColor } from '../Colors';
import type { StyleProps } from '../commonTypes';
import type {
  CSSAnimationConfig,
  CSSTransitionConfig,
  CSSTransitionProperty,
} from './types';

type AnimationSettingProp = keyof Omit<CSSAnimationConfig, 'animationName'>;
type TransitionSettingProp = keyof CSSTransitionConfig;

const ANIMATION_SETTINGS: AnimationSettingProp[] = [
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
];

const TRANSITION_SETTINGS: TransitionSettingProp[] = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
];

const ANIMATION_SETTINGS_SET = new Set<string>(ANIMATION_SETTINGS);
const TRANSITION_SETTINGS_SET = new Set<string>(TRANSITION_SETTINGS);

const isAnimationSetting = (key: string): key is AnimationSettingProp =>
  ANIMATION_SETTINGS_SET.has(key);
const isTransitionSetting = (key: string): key is TransitionSettingProp =>
  TRANSITION_SETTINGS_SET.has(key);

export function isColorProp(prop: string, value: unknown): boolean {
  return (
    prop.toLowerCase().includes('color') &&
    (typeof value === 'string' || typeof value === 'number')
  );
}

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
      const value = style[prop];
      if (prop === 'animationName') {
        continue;
      } else if (isAnimationSetting(prop)) {
        config[prop] = value;

        // TODO: Maybe throw error or display a warning if the same property
        // is defined in more than one style object
      } else if (isColorProp(prop, value)) {
        flattenedStyle[prop] = processCSSAnimationColor(value);
      } else {
        flattenedStyle[prop] = value;
      }
    }
  }

  return [config, flattenedStyle];
}

export function extractTransitionConfigAndFlattenedStyles(
  styles: StyleProps[]
): [CSSTransitionConfig | null, StyleProps] {
  const config: CSSTransitionConfig = {};
  const flattenedStyle: StyleProps = {};
  let hasConfig = false;

  for (const style of styles) {
    for (const prop in style) {
      const value = style[prop];
      if (isTransitionSetting(prop)) {
        config[prop] = value;
        hasConfig = true;
      } else {
        flattenedStyle[prop] = value;
      }
    }
  }

  if (!hasConfig) {
    return [null, {}];
  } else {
    if (!config.transitionProperty) {
      // we default to 'all' transitionProperty
      config.transitionProperty = 'all';
    }
    if (
      typeof config.transitionProperty === 'object' &&
      config.transitionProperty.length === 0
    ) {
      // empty transitionProperty array is the same as 'none'
      config.transitionProperty = 'none';
    }
    return [config, flattenedStyle];
  }
}

export function getTransitionStyles(
  prevStyles: StyleProps,
  nextStyles: StyleProps,
  transitionProperty: CSSTransitionProperty
): [StyleProps | null, StyleProps | null] {
  let prevTransitionStyles: StyleProps = {};
  let nextTransitionStyles: StyleProps = {};

  if (transitionProperty === 'all') {
    prevTransitionStyles = prevStyles;
    nextTransitionStyles = nextStyles;
  } else if (typeof transitionProperty === 'object') {
    for (const prop of transitionProperty) {
      if (prevStyles[prop] && nextStyles[prop]) {
        prevTransitionStyles[prop as string] = prevStyles[prop];
        nextTransitionStyles[prop as string] = nextStyles[prop];
      }
    }
  }

  if (Object.keys(nextTransitionStyles).length === 0) {
    // no styles to transition
    return [null, null];
  } else {
    return [prevTransitionStyles, nextTransitionStyles];
  }
}
