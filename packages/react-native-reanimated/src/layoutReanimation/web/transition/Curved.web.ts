'use strict';
import { LayoutAnimationType } from '../../../commonTypes';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { TransitionData } from '../animationParser';
import type { AnimationConfig } from '../config';
import type { WebEasingsNames } from '../Easing.web';
import { getEasingByName } from '../Easing.web';

function resetStyle(component: HTMLElement) {
  component.style.animationName = ''; // This line prevents unwanted entering animation
  component.style.position = 'absolute';
  component.style.top = '0px';
  component.style.left = '0px';
  component.style.margin = '0px';
  component.style.width = '100%';
  component.style.height = '100%';
}

function showChildren(
  parent: HTMLElement,
  childrenDisplayProperty: Map<HTMLElement, string>,
  shouldShow: boolean
) {
  for (let i = 0; i < parent.children.length; ++i) {
    const child = parent.children[i] as HTMLElement;

    if (shouldShow) {
      child.style.display = childrenDisplayProperty.get(child)!;
    } else {
      childrenDisplayProperty.set(child, child.style.display);
      child.style.display = 'none';
    }
  }
}

function prepareParent(
  element: ReanimatedHTMLElement,
  dummy: ReanimatedHTMLElement,
  animationConfig: AnimationConfig,
  transitionData: TransitionData
) {
  // Adjust configs for `CurvedTransition` and create config object for dummy
  animationConfig.easing = getEasingByName(
    transitionData.easingX as WebEasingsNames
  );

  const childrenDisplayProperty = new Map<HTMLElement, string>();
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

function prepareDummy(
  element: ReanimatedHTMLElement,
  animationConfig: AnimationConfig,
  transitionData: TransitionData,
  dummyTransitionKeyframeName: string
) {
  const dummyAnimationConfig: AnimationConfig = {
    animationName: dummyTransitionKeyframeName,
    animationType: LayoutAnimationType.LAYOUT,
    duration: animationConfig.duration,
    delay: animationConfig.delay,
    easing: getEasingByName(transitionData.easingY as WebEasingsNames),
    callback: null,
    reversed: false,
  };

  const dummy = element.cloneNode(true) as ReanimatedHTMLElement;
  dummy.reanimatedDummy = true;
  resetStyle(dummy);

  return { dummy, dummyAnimationConfig };
}

export function prepareCurvedTransition(
  element: ReanimatedHTMLElement,
  animationConfig: AnimationConfig,
  transitionData: TransitionData,
  dummyTransitionKeyframeName: string
) {
  const { dummy, dummyAnimationConfig } = prepareDummy(
    element,
    animationConfig,
    transitionData,
    dummyTransitionKeyframeName
  );

  prepareParent(element, dummy, animationConfig, transitionData);

  return { dummy, dummyAnimationConfig };
}

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
      },
    },
    duration: 300,
  };

  return {
    firstKeyframeObj: keyframeXObj,
    secondKeyframeObj: keyframeYObj,
  };
}
