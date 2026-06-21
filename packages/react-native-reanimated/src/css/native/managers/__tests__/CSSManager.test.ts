'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { setViewStyle } from '../../proxy';
import CSSManager from '../CSSManager';

jest.mock('../../proxy.ts', () => ({
  setViewStyle: jest.fn(),
  applyCSSAnimations: jest.fn(),
  unregisterCSSAnimations: jest.fn(),
  registerCSSKeyframes: jest.fn(),
  unregisterCSSKeyframes: jest.fn(),
  runCSSTransition: jest.fn(),
  unregisterCSSTransition: jest.fn(),
  registerPseudoStyles: jest.fn(),
  unregisterPseudoStyles: jest.fn(),
  markNodeAsRemovable: jest.fn(),
  unmarkNodeAsRemovable: jest.fn(),
}));

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

  // The revert base is recorded only on Android (the revert subsystem is
  // Android-only). On this iOS-default project a transition detach must not call
  // setViewStyle; the Android behavior is covered in CSSManager.android.test.ts.
  test('does not record a base on a transition-only detach (non-Android)', () => {
    manager.update({ opacity: 0, ...TRANSITION });
    manager.update({ opacity: 1, ...TRANSITION });
    jest.clearAllMocks();

    manager.update({
      opacity: 1,
      transitionProperty: 'opacity',
      transitionDuration: '0ms',
    });

    expect(setViewStyle).not.toHaveBeenCalled();
  });
});
