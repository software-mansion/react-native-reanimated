'use strict';
import { hasSuffix } from '../../common';
import { type WebPropsBuilder, webPropsBuilder } from '../../common/web';
import { getWebSvgPropsBuilder } from '../svg/web';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
} from '../types';
import { normalizeWebKeyframes } from './normalization';
import { parseTimingFunction } from './utils';

export function processKeyframeDefinitions<TStyle extends object>(
  definitions: CSSAnimationKeyframes<TStyle>,
  componentName = ''
) {
  const propsBuilder = getWebSvgPropsBuilder(componentName) ?? webPropsBuilder;

  // Whole-set fixups (strokeDasharray endpoints, open/closed path Z-padding)
  // before serializing each block.
  const keyframes = normalizeWebKeyframes(definitions);

  return Object.entries(keyframes)
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

function processKeyframeBlock<S extends object>(
  { animationTimingFunction, ...rules }: CSSAnimationKeyframeBlock<S>,
  propsBuilder: WebPropsBuilder
): string | null {
  const style = propsBuilder.build(
    rules as Parameters<typeof propsBuilder.build>[0]
  );

  if (!style) {
    return null;
  }

  return animationTimingFunction
    ? `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}; ${style}`
    : style;
}
