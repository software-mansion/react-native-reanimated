import type { TransitionData } from '../animationParser';

export function CurvedTransition(
  keyframeXName: string,
  keyframeYName: string,
  transitionData: TransitionData
) {
  const keyframeXObj = {
    name: keyframeXName,
    style: {
      0: {
        transform: [
          {
            translateX: `${transitionData.translateX}px`,
            scale: `${transitionData.scaleX},${transitionData.scaleY}`,
          },
        ],
        easing: transitionData.easingX,
      },
    },
    duration: 300,
  };

  const keyframeYObj = {
    name: keyframeYName,
    style: {
      0: {
        transform: [
          {
            translateY: `${transitionData.translateY}px`,
            scale: `${transitionData.scaleX},${transitionData.scaleY}`,
          },
        ],
        easing: transitionData.easingY,
      },
    },
    duration: 300,
  };

  return {
    firstKeyframeObj: keyframeXObj,
    secondKeyframeObj: keyframeYObj,
  };
}
