'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { registerPseudoStyles, runCSSTransition } from '../../proxy';
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
  transitionProperty: 'backgroundColor',
  transitionDuration: '300ms',
} as const;

const lastPlatformFlag = () => {
  const { calls } = (runCSSTransition as jest.Mock).mock;
  return calls[calls.length - 1]?.[3];
};

// Runs in the ios jest project. The flag tells native whether Core Animation can
// show the routed properties, which React Native draws on the view's own layer
// only for an invisible or clipped uniform border.
describe('CSSManager (iOS) platform routing flag', () => {
  let manager: CSSManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = newManager();
  });

  test('allows a view without a border', () => {
    manager.update({ backgroundColor: 'red', ...TRANSITION });
    manager.update({ backgroundColor: 'blue', ...TRANSITION });

    expect(lastPlatformFlag()).toBe(true);
  });

  test('blocks a visible border on a non-clipping view', () => {
    manager.update({ backgroundColor: 'red', borderWidth: 2, ...TRANSITION });
    manager.update({ backgroundColor: 'blue', borderWidth: 2, ...TRANSITION });

    expect(lastPlatformFlag()).toBe(false);
  });

  test('allows a visible border when the view clips', () => {
    const style = {
      borderWidth: 2,
      overflow: 'hidden',
      ...TRANSITION,
    } as const;
    manager.update({ backgroundColor: 'red', ...style });
    manager.update({ backgroundColor: 'blue', ...style });

    expect(lastPlatformFlag()).toBe(true);
  });

  test('blocks a run that leaves or targets an ineligible style', () => {
    manager.update({ backgroundColor: 'red', borderWidth: 2, ...TRANSITION });
    // Leaves a bordered style: the border is still rasterized while it changes.
    manager.update({ backgroundColor: 'blue', borderWidth: 0, ...TRANSITION });
    expect(lastPlatformFlag()).toBe(false);

    manager.update({ backgroundColor: 'red', borderWidth: 0, ...TRANSITION });
    expect(lastPlatformFlag()).toBe(true);

    // Targets a bordered style.
    manager.update({ backgroundColor: 'blue', borderWidth: 2, ...TRANSITION });
    expect(lastPlatformFlag()).toBe(false);
  });

  test('re-sends the flag when only the border changes during a transition', () => {
    manager.update({ backgroundColor: 'red', ...TRANSITION });
    manager.update({ backgroundColor: 'blue', ...TRANSITION });
    expect(runCSSTransition).toHaveBeenCalledTimes(1);

    manager.update({ backgroundColor: 'blue', borderWidth: 2, ...TRANSITION });

    expect(runCSSTransition).toHaveBeenCalledTimes(2);
    expect(runCSSTransition).toHaveBeenLastCalledWith(
      expect.anything(),
      {},
      0,
      false
    );
  });
  test('checks each pseudo selector style on top of the default one', () => {
    manager.update({
      backgroundColor: { default: 'red', ':active': 'blue' },
      ':active': { borderWidth: 2 },
      ...TRANSITION,
    } as never);

    expect(registerPseudoStyles).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ platformAllowed: false })
    );
  });
});
