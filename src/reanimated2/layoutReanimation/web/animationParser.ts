'use strict';

import type { TransformsStyle } from 'react-native';

export interface ReanimatedWebTransformProperties {
  translateX?: string;
  translateY?: string;
  rotate?: string;
  rotateX?: string;
  rotateY?: string;
  scale?: number | string;
  scaleX?: number;
  scaleY?: number;
  perspective?: string;
  skew?: string;
  skewX?: string;
}

interface AnimationStyle {
  opacity?: number;
  transform?: ReanimatedWebTransformProperties[];
}

export interface AnimationData {
  name: string;
  style: Record<number, AnimationStyle>;
  duration: number;
}

export interface TransitionData {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  reversed?: boolean;
}

export function convertAnimationObjectToKeyframes(
  animationObject: AnimationData
) {
  let keyframe = `@keyframes ${animationObject.name} { `;

  for (const [timestamp, style] of Object.entries(animationObject.style)) {
    keyframe += `${timestamp}% { `;

    for (const [property, values] of Object.entries(style)) {
      if (property !== 'transform') {
        keyframe += `${property}: ${values}; `;
        continue;
      }

      keyframe += `transform:`;

      values.forEach((value: ReanimatedWebTransformProperties) => {
        for (const [
          transformProperty,
          transformPropertyValue,
        ] of Object.entries(value)) {
          keyframe += ` ${transformProperty}(${transformPropertyValue})`;
        }
      });
      keyframe += `; `; // Property end
    }
    keyframe += `} `; // Timestamp end
  }
  keyframe += `} `; // Keyframe end

  return keyframe;
}

export function convertTransformToString(
  transform: NonNullable<TransformsStyle['transform']> | undefined
) {
  if (!transform) {
    return '';
  }

  type RNTransformProp = (typeof transform)[number];

  let transformString = '';

  // @ts-ignore `transform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
  transform.forEach((transformObject: RNTransformProp) => {
    for (const [key, value] of Object.entries(transformObject)) {
      if (key === 'reversed') {
        continue;
      }

      if (key.indexOf('translate') < 0) {
        transformString += `${key}(${value}) `;
      } else {
        transformString += `${key}(${value}px) `;
      }
    }
  });

  return transformString;
}
