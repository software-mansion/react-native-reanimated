import type { CSSAnimationDirection, CSSAnimationFillMode } from '../../types';

export const VALID_ANIMATION_DIRECTIONS = new Set<CSSAnimationDirection>([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
]);

export const VALID_FILL_MODES = new Set<CSSAnimationFillMode>([
  'none',
  'forwards',
  'backwards',
  'both',
]);

export const OFFSET_REGEX = /^-?\d+(\.\d+)?%$/;
