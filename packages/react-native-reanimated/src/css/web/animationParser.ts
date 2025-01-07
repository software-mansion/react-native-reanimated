'use strict';

import type { BoxShadowValue, TransformsStyle } from 'react-native';
import type {
  CSSAnimationKeyframeBlock,
  CSSAnimationKeyframes,
  PlainStyle,
} from '../types';
import { hasSuffix, kebabize } from './utils';
import { normalizeFontWeight } from '../normalization/common/style';

const propertiesWithoutPx = new Set([
  'color',
  'background-color',
  'text-decoration-color',
  'text-shadow-color',
  'border-color',
  'border-top-color',
  'border-block-start-color',
  'border-right-color',
  'border-end-color',
  'border-bottom-color',
  'border-block-end-color',
  'border-left-color',
  'border-start-color',
  'border-block-color',
  'shadow-color',
  'overlay-color',
  'tint-color',
  'shadow-opacity',
  'flex',
  'flex-grow',
  'flex-shrink',
  'font-weight',
  'aspect-ratio',
  'opacity',
  'z-index',

  // Transform
  'scale',
  'scaleY',
  'scaleX',
  'matrix',
]);

const shouldHaveSuffix = (property: string, value: number | string) =>
  !propertiesWithoutPx.has(property) &&
  (typeof value === 'number' || !hasSuffix(value));

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

      return `${transformProperty === 'matrix' ? 'matrix3d' : transformProperty}(${transformPropertyValue}${suffix})`;
    })
    .join(' ');
}

function processBoxShadowProperty(
  boxShadow: string | ReadonlyArray<BoxShadowValue>
) {
  if (typeof boxShadow === 'string') {
    return boxShadow;
  }

  return boxShadow
    .map((boxShadowObject) => {
      const { offsetX, offsetY, blurRadius, spreadDistance, color, inset } =
        boxShadowObject;

      const maybeSuffixedOffsetX = hasSuffix(offsetX)
        ? offsetX
        : `${offsetX}px`;
      const maybeSuffixedOffsetY = hasSuffix(offsetY)
        ? offsetY
        : `${offsetY}px`;
      const maybeSuffixedBlurRadius = blurRadius
        ? hasSuffix(blurRadius)
          ? blurRadius
          : `${String(blurRadius)}px`
        : '';
      const maybeSuffixedSpreadDistance = spreadDistance
        ? hasSuffix(spreadDistance)
          ? spreadDistance
          : `${spreadDistance}px`
        : '';

      const position = inset === undefined ? '' : inset ? 'inset' : 'outset';

      return `${maybeSuffixedOffsetX} ${maybeSuffixedOffsetY} ${maybeSuffixedBlurRadius} ${maybeSuffixedSpreadDistance} ${color ?? ''} ${position}`;
    })
    .join(', ');
}

function convertPropertyName(property: string) {
  if (property === 'marginHorizontal') {
    return 'margin-inline';
  }

  if (property === 'marginVertical') {
    return 'margin-block';
  }

  if (property === 'paddingHorizontal') {
    return 'padding-inline';
  }

  if (property === 'paddingVertical') {
    return 'padding-block';
  }

  return kebabize(property);
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

      if (property === 'boxShadow') {
        return `box-shadow: ${processBoxShadowProperty(values)};`;
      }

      if (property === 'fontWeight') {
        return `font-weight: ${normalizeFontWeight(values)};`;
      }

      if (
        property.toLowerCase().includes('color') &&
        values.startsWith('hwb')
      ) {
        return `${kebabize(property)}: ${values.replace(/,/g, '')};`;
      }

      if (property !== 'transform') {
        const convertedPropertyName = convertPropertyName(property);
        const suffix = shouldHaveSuffix(convertedPropertyName, values)
          ? 'px'
          : '';

        return `${convertedPropertyName}: ${values}${suffix};`;
      }

      return `transform: ${processTransformProperty(values)};`;
    })
    .join(' ');
}
