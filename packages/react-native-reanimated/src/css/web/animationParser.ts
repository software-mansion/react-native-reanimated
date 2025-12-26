'use strict';
import type { PlainStyle } from '../../common';
import { hasSuffix } from '../../common';
import { webPropsBuilder } from '../../common/web';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
} from '../types';
import { parseTimingFunction } from './utils';

export function processKeyframeDefinitions(definitions: CSSAnimationKeyframes) {
  return Object.entries(definitions)
    .reduce<string[]>((acc, [timestamp, rules]) => {
      const step = hasSuffix(timestamp)
        ? timestamp
        : `${parseFloat(timestamp) * 100}%`;

      const processedBlock = processKeyframeBlock(rules);

      if (!processedBlock) {
        return acc;
      }

      acc.push(`${step} { ${processedBlock} }`);

      return acc;
    }, [])
    .join(' ');
}

function processKeyframeBlock({
  animationTimingFunction,
  ...rules
}: CSSAnimationKeyframeBlock<PlainStyle>): string | null {
  const styleObject = webPropsBuilder.build(rules);

  if (!styleObject) {
    return null;
  }

  // Convert DOM style object to CSS string
  const style = Object.entries(styleObject)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
