'use strict';

import { LayoutAnimationType } from '../../../commonTypes';
import { getEasingByName } from '../Easing.web';
function resetStyle(component) {
  component.style.animationName = ''; // This line prevents unwanted entering animation
  component.style.position = 'absolute';
  component.style.top = '0px';
  component.style.left = '0px';
  component.style.margin = '0px';
  component.style.width = '100%';
  component.style.height = '100%';
}
function showChildren(parent, childrenDisplayProperty, shouldShow) {
  for (let i = 0; i < parent.children.length; ++i) {
    const child = parent.children[i];
    if (shouldShow) {
      child.style.display = childrenDisplayProperty.get(child);
    } else {
      childrenDisplayProperty.set(child, child.style.display);
      child.style.display = 'none';
    }
  }
}
function prepareParent(element, dummy, animationConfig, transitionData) {
  // Adjust configs for `CurvedTransition` and create config object for dummy
  animationConfig.easing = getEasingByName(transitionData.easingX);
  const childrenDisplayProperty = new Map();
  showChildren(element, childrenDisplayProperty, false);
  const originalBackgroundColor = element.style.backgroundColor;
  element.style.backgroundColor = 'transparent';
  const onFinalize = () => {
    if (element.contains(dummy)) {
      element.removeChild(dummy);
    }
    showChildren(element, childrenDisplayProperty, true);
    element.style.backgroundColor = originalBackgroundColor;
  };
  const animationCancelCallback = () => {
    onFinalize();
    element.removeEventListener('animationcancel', animationCancelCallback);
  };
  const animationEndCallback = () => {
    onFinalize();
    element.removeEventListener('animationend', animationEndCallback);
  };
  element.addEventListener('animationend', animationEndCallback);
  element.addEventListener('animationcancel', animationCancelCallback);
  element.appendChild(dummy);
}
function prepareDummy(element, animationConfig, transitionData, dummyTransitionKeyframeName) {
  const dummyAnimationConfig = {
    animationName: dummyTransitionKeyframeName,
    animationType: LayoutAnimationType.LAYOUT,
    duration: animationConfig.duration,
    delay: animationConfig.delay,
    easing: getEasingByName(transitionData.easingY),
    callback: null,
    reversed: false
  };
  const dummy = element.cloneNode(true);
  dummy.reanimatedDummy = true;
  resetStyle(dummy);
  return {
    dummy,
    dummyAnimationConfig
  };
}
export function prepareCurvedTransition(element, animationConfig, transitionData, dummyTransitionKeyframeName) {
  const {
    dummy,
    dummyAnimationConfig
  } = prepareDummy(element, animationConfig, transitionData, dummyTransitionKeyframeName);
  prepareParent(element, dummy, animationConfig, transitionData);
  return {
    dummy,
    dummyAnimationConfig
  };
}
export function CurvedTransition(keyframeXName, keyframeYName, transitionData) {
  const keyframeXObj = {
    name: keyframeXName,
    style: {
      0: {
        transform: [{
          translateX: `${transitionData.translateX}px`,
          scale: `${transitionData.scaleX},${transitionData.scaleY}`
        }]
      }
    },
    duration: 300
  };
  const keyframeYObj = {
    name: keyframeYName,
    style: {
      0: {
        transform: [{
          translateY: `${transitionData.translateY}px`,
          scale: `${transitionData.scaleX},${transitionData.scaleY}`
        }]
      }
    },
    duration: 300
  };
  return {
    firstKeyframeObj: keyframeXObj,
    secondKeyframeObj: keyframeYObj
  };
}
//# sourceMappingURL=Curved.web.js.map