'use strict';

import type { TransformsStyle } from 'react-native';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
  PlainStyle,
} from '../types';
import { hasSuffix, kebabize } from './utils';

let currentAnimationID = 0;

const propertiesWithoutPx = new Set(['font-weight', 'opacity', 'z-index']);

const generateNextKeyframeName = () => `REACSS${currentAnimationID++}`;
const shouldHaveSuffix = (property: string, value: number | string) =>
  !propertiesWithoutPx.has(property) &&
  (typeof value === 'number' || !hasSuffix(value));

function processKeyframeDefinitions(definitions: CSSAnimationKeyframes) {
  return Object.entries(definitions)
    .map(
      ([timestamp, rules]) => `${timestamp} { ${processKeyframeBlock(rules)} }`
    )
    .join(' ');
}

function processTransformProperty(
  transform: NonNullable<TransformsStyle['transform']> | string
) {
  if (typeof transform === 'string') {
    return transform;
  }

  return transform
    .map((property) => {
      const transformProperty = Object.keys(property)[0];
      const transformPropertyValue = Object.values(property)[0];

      const suffix = shouldHaveSuffix(transformProperty, transformPropertyValue)
        ? 'px'
        : '';

      return `${transformProperty}(${transformPropertyValue}${suffix})`;
    })
    .join(' ');
}

function processKeyframeBlock(rules: CSSAnimationKeyframeBlock<PlainStyle>) {
  return Object.entries(rules)
    .map(([property, values]) => {
      if (property === 'originX') {
        return `left: ${values}px;`;
      }

      if (property === 'originY') {
        return `top: ${values}px;`;
      }

      if (property !== 'transform') {
        const convertedPropertyName = kebabize(property);
        const suffix = shouldHaveSuffix(convertedPropertyName, values)
          ? 'px'
          : '';

        return `${convertedPropertyName}: ${values}${suffix};`;
      }

      return `transform: ${processTransformProperty(values)};`;
    })
    .join(' ');
}

function parseCSSAnimation(
  definitions: CSSAnimationKeyframes,
  animationName: string
): string {
  return `@keyframes ${animationName} { ${processKeyframeDefinitions(definitions)} }`;
}

export function generateKeyframe(definitions: CSSAnimationKeyframes) {
  const animationName = generateNextKeyframeName();
  const keyframes = parseCSSAnimation(definitions, animationName);

  return { animationName, keyframes };
}
