'use strict';
import type { PlainStyle } from '../../common';
import { hasSuffix } from '../../common';
import { type WebPropsBuilder, webPropsBuilder } from '../../common/web';
import { getWebSvgPropsBuilder } from '../svg/web';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
} from '../types';
import { parseTimingFunction } from './utils';

export function processKeyframeDefinitions(
  definitions: CSSAnimationKeyframes,
  componentName = ''
) {
  const propsBuilder = getWebSvgPropsBuilder(componentName) ?? webPropsBuilder;

  return Object.entries(definitions)
    .reduce<string[]>((acc, [timestamp, rules]) => {
      const step = hasSuffix(timestamp)
        ? timestamp
        : `${parseFloat(timestamp) * 100}%`;

      const processedBlock = processKeyframeBlock(rules, propsBuilder);

      if (!processedBlock) {
        return acc;
      }

      acc.push(`${step} { ${processedBlock} }`);

      return acc;
    }, [])
    .join(' ');
}

function processKeyframeBlock(
  { animationTimingFunction, ...rules }: CSSAnimationKeyframeBlock<PlainStyle>,
  propsBuilder: WebPropsBuilder
): string | null {
  const style = propsBuilder.build(rules);

  if (!style) {
    return null;
  }

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
