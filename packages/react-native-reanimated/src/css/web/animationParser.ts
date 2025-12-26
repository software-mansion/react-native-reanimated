'use strict';
import type { PlainStyle } from '../../common';
import { hasSuffix, kebabizeCamelCase } from '../../common';
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

  const styleEntries: string[] = [];

  // Add animation-timing-function if present
  if (animationTimingFunction) {
    styleEntries.push(
      `animation-timing-function: ${parseTimingFunction(animationTimingFunction)}`
    );
  }

  // Convert DOM style object to CSS string with kebab-case properties
  for (const [key, value] of Object.entries(styleObject)) {
    if (value !== undefined && value !== null) {
      styleEntries.push(`${kebabizeCamelCase(key)}: ${value}`);
    }
  }

  return styleEntries.length > 0 ? styleEntries.join('; ') : null;
}
