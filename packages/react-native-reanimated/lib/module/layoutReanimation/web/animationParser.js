'use strict';

import { WebEasings } from "./Easing.web.js";
export function convertAnimationObjectToKeyframes(animationObject) {
  let keyframe = `@keyframes ${animationObject.name} { `;
  for (const [timestamp, style] of Object.entries(animationObject.style)) {
    const step = timestamp === 'from' ? 0 : timestamp === 'to' ? 100 : timestamp;
    keyframe += `${step}% { `;
    for (const [property, values] of Object.entries(style)) {
      if (property === 'easing') {
        let easingName = 'linear';
        if (values in WebEasings) {
          easingName = values;
        } else if (values.name in WebEasings) {
          easingName = values.name;
        }
        keyframe += `animation-timing-function: cubic-bezier(${WebEasings[easingName].toString()});`;
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
      values.forEach(value => {
        for (const [transformProperty, transformPropertyValue] of Object.entries(value)) {
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
//# sourceMappingURL=animationParser.js.map