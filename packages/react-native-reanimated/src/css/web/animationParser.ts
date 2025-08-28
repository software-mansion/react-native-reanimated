'use strict';
import { hasSuffix } from '../../common';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
  PlainStyle,
} from '../types';
import { PROPERTIES_CONFIG } from './config';
import { createStyleBuilder } from './style';
import { parseTimingFunction } from './utils';

const styleBuilder = createStyleBuilder(PROPERTIES_CONFIG);

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
  const style = styleBuilder.buildFrom(rules);

  if (!style) {
    return null;
  }

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
