import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
  PlainStyle,
} from '../../types';
import { hasSuffix, parseTimingFunction } from '../utils';
import styleBuilder from './styleBuilder';

export function processKeyframeDefinitions(definitions: CSSAnimationKeyframes) {
  return Object.entries(definitions)
    .map(([timestamp, rules]) => {
      const step = hasSuffix(timestamp)
        ? timestamp
        : `${parseFloat(timestamp) * 100}%`;

      return `${step} { ${processKeyframeBlock(rules)} }`;
    })
    .join(' ');
}

function processKeyframeBlock({
  animationTimingFunction,
  ...rules
}: CSSAnimationKeyframeBlock<PlainStyle>) {
  const style = styleBuilder.buildFrom(rules);

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
