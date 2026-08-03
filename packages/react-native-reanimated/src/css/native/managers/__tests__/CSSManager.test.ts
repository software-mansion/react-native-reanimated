'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
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

  describe('callback warnings', () => {
    const ANIMATION = {
      animationName: { from: { opacity: 0 } },
      animationDuration: '2s',
    } as const;

    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      warn.mockRestore();
    });

    test('does not warn when the animation detaches but its callbacks stay', () => {
      manager.update({ ...ANIMATION, onAnimationCancel: jest.fn() });
      // Detaching keeps the callbacks so the resulting cancel still arrives,
      // which must not be reported as callbacks that can never fire.
      manager.update({ onAnimationCancel: jest.fn() });

      expect(warn).not.toHaveBeenCalled();
    });

    test('warns when callbacks are provided to a view that never had an animation', () => {
      manager.update({ onAnimationEnd: jest.fn() });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('onAnimationEnd')
      );
    });
  });
});
