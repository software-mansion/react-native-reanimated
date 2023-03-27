import { withStyleAnimation } from '../animation/styleAnimation';
import { SharedValue } from '../commonTypes';
import { makeUIMutable } from '../mutables';
import {
  LayoutAnimationFunction,
  LayoutAnimationType,
  LayoutAnimationsValues,
} from './animationBuilder';
import { runOnUIImmediately } from '../threads';

const TAG_OFFSET = 1e9;

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  animationType: LayoutAnimationType
): void {
  'worklet';
  const isSharedTransition =
    animationType === LayoutAnimationType.SHARED_ELEMENT_TRANSITION;
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    _notifyAboutProgress(tag, sharedValue.value, isSharedTransition);
  });
}

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  cancelled: boolean,
  removeView: boolean
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
  _notifyAboutEnd(tag, cancelled, removeView);
}

function createLayoutAnimationManager() {
  'worklet';
  const enteringAnimationForTag = new Map();
  const mutableValuesForTag = new Map();

  return {
    start(
      tag: number,
      type: LayoutAnimationType,
      yogaValues: LayoutAnimationsValues,
      config: LayoutAnimationFunction
    ) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      if (type === LayoutAnimationType.ENTERING) {
        enteringAnimationForTag.set(tag, currentAnimation);
      } else if (type === LayoutAnimationType.LAYOUT) {
        // When layout animation is requested, but entering is still running, we merge
        // new layout animation targets into the ongoing animation
        const enteringAnimation = enteringAnimationForTag.get(tag);
        if (enteringAnimation) {
          currentAnimation = { ...enteringAnimation, ...style.animations };
        }
      }

      let value = mutableValuesForTag.get(tag);
      if (value === undefined) {
        value = makeUIMutable(style.initialValues);
        mutableValuesForTag.set(tag, value);
      } else {
        stopObservingProgress(tag, value, false, false);
        value._value = style.initialValues;
      }

      // @ts-ignore The line below started failing because I added types to the method – don't have time to fix it right now
      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          enteringAnimationForTag.delete(tag);
          mutableValuesForTag.delete(tag);
          const shouldRemoveView = type === LayoutAnimationType.EXITING;
          stopObservingProgress(tag, value, finished, shouldRemoveView);
        }
        style.callback &&
          style.callback(finished === undefined ? false : finished);
      };

      startObservingProgress(tag, value, type);
      value.value = animation;
    },
    stop(tag: number) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      stopObservingProgress(tag, value, true, true);
    },
  };
}

runOnUIImmediately(() => {
  'worklet';
  global.LayoutAnimationsManager = createLayoutAnimationManager();
})();
