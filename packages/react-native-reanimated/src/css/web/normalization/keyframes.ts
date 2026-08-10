'use strict';
import {
  withImplicitStrokeDashArrayBounds,
  withMatchingPathStructure,
} from '../../svg/web/processors';
import type { CSSAnimationKeyframes } from '../../types';

type KeyframesNormalizer = (
  keyframes: CSSAnimationKeyframes
) => CSSAnimationKeyframes;

// Whole-set keyframe fixups (need every keyframe at once, not one value). Each
// is a no-op unless its prop is animated, so order is irrelevant.
const NORMALIZERS: readonly KeyframesNormalizer[] = [
  withImplicitStrokeDashArrayBounds,
  withMatchingPathStructure,
];

export const normalizeWebKeyframes: KeyframesNormalizer = (keyframes) =>
  NORMALIZERS.reduce((acc, normalize) => normalize(acc), keyframes);
