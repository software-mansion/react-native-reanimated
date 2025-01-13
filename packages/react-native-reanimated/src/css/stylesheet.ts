import { CSSKeyframesRuleImpl } from './models';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  CSSStyleProperties,
  PlainStyle,
} from './types';

type NamedStyles<T> = { [P in keyof T]: CSSStyleProperties };

const create = <T extends NamedStyles<T>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: T & NamedStyles<any>
): T => {
  // TODO - implement more optimizations and correctness checks in dev here
  if (__DEV__) {
    for (const key in styles) {
      if (styles[key]) {
        Object.freeze(styles[key]);
      }
    }
  }
  return styles;
};

function keyframes<S extends PlainStyle>(
  // TODO - think of better types
  keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> &
    CSSAnimationKeyframes<PlainStyle>
): CSSKeyframesRule {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}

const css = { create, keyframes };

export { css };
