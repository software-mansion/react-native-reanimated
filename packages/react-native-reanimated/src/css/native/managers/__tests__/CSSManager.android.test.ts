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

// Runs in the android jest project (Platform.OS === 'android'), so IS_ANDROID is
// true: on a transition detach, CSSManager must call the props setter
// (setViewStyle) with the committed style so the native Android revert restores
// the inline values instead of interpolator defaults.
describe('CSSManager (Android revert base)', () => {
  let manager: CSSManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = newManager();
  });

  const attachRunningTransition = () => {
    manager.update({ opacity: 0, ...TRANSITION });
    manager.update({ opacity: 1, ...TRANSITION });
  };

  test('records the committed style when a 0ms config detaches a running transition', () => {
    attachRunningTransition();
    jest.clearAllMocks();

    // Props are still present, but the 0ms duration normalizes to an empty config.
    manager.update({
      opacity: 0,
      transitionProperty: 'opacity',
      transitionDuration: '0ms',
    });

    expect(setViewStyle).toHaveBeenCalledWith(
      viewTag,
      expect.objectContaining({ opacity: 0 })
    );
  });

  test('records the committed style when transition props are removed', () => {
    attachRunningTransition();
    jest.clearAllMocks();

    manager.update({ opacity: 1 });

    expect(setViewStyle).toHaveBeenCalledWith(
      viewTag,
      expect.objectContaining({ opacity: 1 })
    );
  });
});
