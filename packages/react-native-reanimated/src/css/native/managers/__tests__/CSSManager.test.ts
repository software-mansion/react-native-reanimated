'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { cssCallbacksRegistry } from '../../events';
import { setViewStyle } from '../../proxy';
import CSSManager from '../CSSManager';

jest.mock('../../proxy');

const viewTag = 1;
const newManager = () =>
  new CSSManager(
    {
      shadowNodeWrapper: {} as ShadowNodeWrapper,
      viewTag,
      reactViewName: 'RCTView',
    },
    'View'
  );

const TRANSITION = {
  transitionProperty: 'opacity',
  transitionDuration: '300ms',
} as const;

describe('CSSManager', () => {
  let manager: CSSManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = newManager();
  });

  test('records the committed base style when an animation is attached', () => {
    manager.update({
      opacity: 0.5,
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationDuration: '1s',
    });

    expect(setViewStyle).toHaveBeenCalledWith(
      viewTag,
      expect.objectContaining({ opacity: 0.5 })
    );
  });

  test('does not call the props setter for a plain style update', () => {
    manager.update({ opacity: 0.5 });

    expect(setViewStyle).not.toHaveBeenCalled();
  });

  test('does not call the props setter while a transition is running', () => {
    manager.update({ opacity: 0, ...TRANSITION });
    jest.clearAllMocks();

    // Triggers a running transition - there is no base to record for it.
    manager.update({ opacity: 1, ...TRANSITION });

    expect(setViewStyle).not.toHaveBeenCalled();
  });

  // The same detach records a base on Android (see CSSManager.android.test.ts);
  // here the revert subsystem is absent, so the platform gate keeps it silent.
  test('does not call the props setter when a transition detaches (non-Android)', () => {
    manager.update({ opacity: 0, ...TRANSITION });
    manager.update({ opacity: 1, ...TRANSITION });
    jest.clearAllMocks();

    // The 0ms duration normalizes to an empty config and detaches the transition.
    manager.update({
      opacity: 1,
      transitionProperty: 'opacity',
      transitionDuration: '0ms',
    });

    expect(setViewStyle).not.toHaveBeenCalled();
  });

  describe('animation callbacks', () => {
    const ANIMATION = {
      animationName: { from: { opacity: 0 } },
      animationDuration: '2s',
    } as const;

    const event = (type: 'animationEnd' | 'animationCancel') => ({
      tag: viewTag,
      type,
      name: 'fadeIn',
      elapsedTime: 2,
    });

    beforeEach(() => {
      cssCallbacksRegistry.clear();
    });

    test('delivers a native event to the provided callback', () => {
      const onAnimationEnd = jest.fn();
      manager.update({ ...ANIMATION, onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onAnimationEnd).toHaveBeenCalledWith({
        animationName: 'fadeIn',
        elapsedTime: 2,
      });
    });

    test('starts delivering when a callback appears after the first update', () => {
      const onAnimationEnd = jest.fn();
      manager.update(ANIMATION);
      manager.update({ ...ANIMATION, onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onAnimationEnd).toHaveBeenCalledWith({
        animationName: 'fadeIn',
        elapsedTime: 2,
      });
    });

    test('keeps delivering events while the animation detaches', () => {
      const onAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION, onAnimationCancel });
      manager.update({ onAnimationCancel });

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('drops a cancel emitted for an animation removed together with its callbacks', () => {
      const onAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION, onAnimationCancel });
      // The animation and its callbacks go away in the same update, so the
      // native side may still emit a cancel using the mask it had before.
      manager.update({});

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onAnimationCancel).not.toHaveBeenCalled();
    });

    test('delivers the cancel the engine emits while the view unmounts', () => {
      const onAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION, onAnimationCancel });
      // The engine emits the cancel during cleanup, but its batch is dispatched
      // after cleanup has already returned.
      manager.unmountCleanup();

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('delivers a transition event to the provided callback', () => {
      const onTransitionEnd = jest.fn();
      manager.update({
        opacity: 0,
        transitionProperty: 'opacity',
        transitionDuration: '300ms',
        onTransitionEnd,
      });

      cssCallbacksRegistry.dispatch([
        {
          tag: viewTag,
          type: 'transitionEnd',
          name: 'opacity',
          elapsedTime: 0.3,
        },
      ]);

      expect(onTransitionEnd).toHaveBeenCalledWith({
        propertyName: 'opacity',
        elapsedTime: 0.3,
      });
    });

  });
});
