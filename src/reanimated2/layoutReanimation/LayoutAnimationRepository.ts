import { runOnUI } from '../core';
import { withStyleAnimation } from '../animation/styleAnimation';
import { LogBox } from 'react-native';
import { SharedValue } from '../commonTypes';
import { makeUIMutable } from '../mutables';

const TAG_OFFSET = 1e9;

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>
): void {
  'worklet';
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    _notifyAboutProgress(tag, sharedValue.value);
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

LogBox.ignoreLogs(['Overriding previous layout animation with']);

runOnUI(() => {
  'worklet';

  const enteringAnimationForTag = new Map();
  const mutableValuesForTag = new Map();

  global.LayoutAnimationRepository = {
    startAnimationForTag(tag, type, yogaValues, config) {
      const style = config(yogaValues);
      let currentAnimation = style.animations;

      if (type === 'entering') {
        enteringAnimationForTag.set(tag, currentAnimation);
      } else if (type === 'layout') {
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

      const animation = withStyleAnimation(currentAnimation);

      animation.callback = (finished?: boolean) => {
        if (finished) {
          enteringAnimationForTag.delete(tag);
          mutableValuesForTag.delete(tag);
          const shouldRemoveView = type === 'exiting';
          stopObservingProgress(tag, value, finished, shouldRemoveView);
        }
        style.callback && style.callback(finished);
      };

      value.value = animation;
      startObservingProgress(tag, value);
    },
  };
})();
