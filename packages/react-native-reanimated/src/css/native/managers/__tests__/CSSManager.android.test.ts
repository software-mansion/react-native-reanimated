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

// Runs in the android jest project (Platform.OS === 'android'), so IS_ANDROID is
// true. The revert subsystem is Android-only, so unlike other platforms a
// transition detach records the committed style via the props setter
// (setViewStyle) for the native revert to restore.
describe('CSSManager (Android)', () => {
  let manager: CSSManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = newManager();
  });

  const attachRunningTransition = () => {
    manager.update({ opacity: 0, ...TRANSITION });
    manager.update({ opacity: 1, ...TRANSITION });
  };

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

  // The base is recorded only on a detach, not for every transition update, so a
  // still-running transition must stay silent even on Android.
  test('does not call the props setter while a transition keeps running', () => {
    manager.update({ opacity: 0, ...TRANSITION });
    jest.clearAllMocks();

    manager.update({ opacity: 1, ...TRANSITION });

    expect(setViewStyle).not.toHaveBeenCalled();
  });

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
