export interface TransformProperties {
  translateX?: string;
  translateY?: string;
  rotate?: string;
  rotateX?: string;
  rotateY?: string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  perspective?: string;
  skew?: string;
  skewX?: string;
}

export interface AnimationStyle {
  opacity?: number;
  transform?: TransformProperties[];
}
export interface AnimationData {
  name: string;
  style: Record<number, AnimationStyle>;
  duration: number;
}

export function parseAnimationObjectToKeyframe(
  animationObject: AnimationData
): string {
  let keyframe = `@keyframes ${animationObject.name} { `;

  for (const [timestamp, style] of Object.entries(animationObject.style)) {
    keyframe += `${timestamp}% { `;

    for (const [property, values] of Object.entries(style)) {
      if (property !== 'transform') {
        keyframe += `${property}: ${values}; `;
        continue;
      }

      keyframe += `transform:`;

      values.forEach((value: TransformProperties) => {
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
