'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { cssCallbacksRegistry } from '../../events';
import { runCSSTransition, setViewStyle } from '../../proxy';
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
      const onCSSAnimationEnd = jest.fn();
      manager.update({ ...ANIMATION }, { onCSSAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onCSSAnimationEnd).toHaveBeenCalledWith({
        animationName: 'fadeIn',
        elapsedTime: 2,
      });
    });

    test('starts delivering when a callback appears after the first update', () => {
      const onCSSAnimationEnd = jest.fn();
      manager.update(ANIMATION);
      manager.update({ ...ANIMATION }, { onCSSAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onCSSAnimationEnd).toHaveBeenCalledWith({
        animationName: 'fadeIn',
        elapsedTime: 2,
      });
    });

    test('keeps delivering events while the animation detaches', () => {
      const onCSSAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION }, { onCSSAnimationCancel });
      manager.update({}, { onCSSAnimationCancel });

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onCSSAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('drops a cancel emitted for an animation removed together with its callbacks', () => {
      const onCSSAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION }, { onCSSAnimationCancel });
      // The animation and its callbacks go away in the same update, so the
      // native side may still emit a cancel using the mask it had before.
      manager.update({});

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onCSSAnimationCancel).not.toHaveBeenCalled();
    });

    test('delivers the cancel the engine emits while the view unmounts', () => {
      const onCSSAnimationCancel = jest.fn();
      manager.update({ ...ANIMATION }, { onCSSAnimationCancel });
      // The engine emits the cancel during cleanup, but its batch is dispatched
      // after cleanup has already returned.
      manager.unmountCleanup();

      cssCallbacksRegistry.dispatch([event('animationCancel')]);

      expect(onCSSAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('delivers a transition event to the provided callback', () => {
      const onCSSTransitionEnd = jest.fn();
      manager.update(
        {
          opacity: 0,
          transitionProperty: 'opacity',
          transitionDuration: '300ms',
        },
        { onCSSTransitionEnd }
      );

      cssCallbacksRegistry.dispatch([
        {
          tag: viewTag,
          type: 'transitionEnd',
          name: 'opacity',
          elapsedTime: 0.3,
        },
      ]);

      expect(onCSSTransitionEnd).toHaveBeenCalledWith({
        propertyName: 'opacity',
        elapsedTime: 0.3,
      });
    });
  });

  describe('transition baseline', () => {
    const ANIMATION = {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationDuration: '1s',
    } as const;

    const transitionedValues = () =>
      (runCSSTransition as jest.Mock).mock.calls
        .map(([, config]) => config?.opacity?.value)
        .filter(Boolean);

    test('keeps the baseline of an animation-only view for a later transition', () => {
      manager.update({ opacity: 0, ...ANIMATION });
      jest.clearAllMocks();

      manager.update({ opacity: 1, ...ANIMATION, ...TRANSITION });

      expect(transitionedValues()).toEqual([[0, 1]]);
    });

    test('keeps the baseline across a commit whose config normalizes to none', () => {
      manager.update({ opacity: 0.5, ...TRANSITION });
      manager.update({
        opacity: 0.5,
        transitionProperty: 'opacity',
        transitionDuration: '0ms',
      });
      jest.clearAllMocks();

      manager.update({ opacity: 1, ...TRANSITION });

      expect(transitionedValues()).toEqual([[0.5, 1]]);
    });

    test('does not transition from default values when a config is attached', () => {
      manager.update({ opacity: 0.2 });
      jest.clearAllMocks();

      manager.update({ opacity: 0.2, ...TRANSITION });

      expect(transitionedValues()).toEqual([]);

      // The attached config still takes 0.2 as the baseline of the next change.
      manager.update({ opacity: 1, ...TRANSITION });

      expect(transitionedValues()).toEqual([[0.2, 1]]);
    });
  });
});
