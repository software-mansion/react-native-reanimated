'use strict';

export function LinearTransition(name, transitionData) {
  const {
    translateX,
    translateY,
    scaleX,
    scaleY
  } = transitionData;
  const linearTransition = {
    name,
    style: {
      0: {
        transform: [{
          translateX: `${translateX}px`,
          translateY: `${translateY}px`,
          scale: `${scaleX},${scaleY}`
        }]
      }
    },
    duration: 300
  };
  return linearTransition;
}
//# sourceMappingURL=Linear.web.js.map