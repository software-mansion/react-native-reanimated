'use strict';
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

function processKeyframeBlock<S extends object>({
  animationTimingFunction,
  ...rules
}: CSSAnimationKeyframeBlock<S>): string | null {
  const style = webPropsBuilder.build(
    rules as Parameters<typeof webPropsBuilder.build>[0]
  );

  if (!style) {
    return null;
  }

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
