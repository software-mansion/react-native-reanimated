'use strict';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationPlayState,
} from '../../../types';

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

export const VALID_PLAY_STATES = new Set<CSSAnimationPlayState>([
  'running',
  'paused',
]);
