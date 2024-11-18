'use strict';

import { WebEasings } from './Easing.web';
import type { WebEasingsNames } from './Easing.web';

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

export interface AnimationStyle {
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
  easingX?: string;
  easingY?: string;
  entering?: any;
  exiting?: any;
}

export function convertAnimationObjectToKeyframes(
  animationObject: AnimationData
) {
  let keyframe = `@keyframes ${animationObject.name} { `;

  for (const [timestamp, style] of Object.entries(animationObject.style)) {
    const step =
      timestamp === 'from' ? 0 : timestamp === 'to' ? 100 : timestamp;

    keyframe += `${step}% { `;

    for (const [property, values] of Object.entries(style)) {
      if (property === 'easing') {
        let easingName: WebEasingsNames = 'linear';

        if (values in WebEasings) {
          easingName = values;
        } else if (values.name in WebEasings) {
          easingName = values.name;
        }

        keyframe += `animation-timing-function: cubic-bezier(${WebEasings[
          easingName
        ].toString()});`;

        continue;
      }

      if (property === 'originX') {
        keyframe += `left: ${values}px; `;
        continue;
      }

      if (property === 'originY') {
        keyframe += `top: ${values}px; `;
        continue;
      }

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
