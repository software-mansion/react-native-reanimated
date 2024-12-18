'use strict';
import type { CSSAnimationKeyframes, CSSStyle, PlainStyle } from '../types';

type NamedStyles<T> = { [P in keyof T]: CSSStyle };

export const create = <T extends NamedStyles<T>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: T & NamedStyles<any>
): T => {
  // TODO - implement normalization and other optimizations in here
  return styles;
};

export function keyframes<S extends PlainStyle>(
  // TODO - think of better types
  keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> &
    CSSAnimationKeyframes<PlainStyle>
): CSSAnimationKeyframes<S> {
  // TODO - implement normalization in here
  return keyframeDefinitions as CSSAnimationKeyframes<S>;
}
