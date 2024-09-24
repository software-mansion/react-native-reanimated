import { processCSSAnimationColor } from '../Colors';
import type { StyleProps } from '../commonTypes';
import type {
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSAnimationSettings,
  CSSTransitionConfig,
  CSSTransitionProperty,
} from './types';

type AnimationSettingProp = keyof CSSAnimationSettings;
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

export function extractCSSConfigsAndFlattenedStyles(
  styles: StyleProps[]
): [CSSAnimationConfig | null, CSSTransitionConfig | null, StyleProps] {
  let animationName: CSSAnimationKeyframes | null = null;
  let transitionProperty: CSSTransitionProperty | null = null;
  const animationConfig: Partial<CSSAnimationConfig> = {};
  const transitionConfig: Partial<CSSTransitionConfig> = {};
  const flattenedStyle: StyleProps = {};

  for (const style of styles) {
    for (const prop in style) {
      const value = style[prop];

      if (prop === 'animationName') {
        animationName = value as CSSAnimationKeyframes;
      } else if (prop === 'transitionProperty') {
        transitionProperty = value as CSSTransitionProperty;
      } else if (isAnimationSetting(prop)) {
        animationConfig[prop] = value;
      } else if (isTransitionSetting(prop)) {
        transitionConfig[prop] = value;
      } else if (isColorProp(prop, value)) {
        flattenedStyle[prop] = processCSSAnimationColor(value);
      } else {
        flattenedStyle[prop] = value;
      }
    }
  }

  // Return animationConfig only if the animationName is present
  const finalAnimationConfig = animationName
    ? ({ ...animationConfig, animationName } as CSSAnimationConfig)
    : null;

  // Return transitionConfig only if the transitionProperty is present
  const hasTransitionConfig = Array.isArray(transitionProperty)
    ? transitionProperty.length > 0
    : !!transitionProperty;
  const finalTransitionConfig = hasTransitionConfig
    ? ({ ...transitionConfig, transitionProperty } as CSSTransitionConfig)
    : null;

  return [finalAnimationConfig, finalTransitionConfig, flattenedStyle];
}
