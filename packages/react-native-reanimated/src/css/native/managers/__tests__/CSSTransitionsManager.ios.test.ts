'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { runCSSTransition } from '../../proxy';
import CSSTransitionsManager from '../CSSTransitionsManager';

jest.mock('../../proxy.ts', () => ({
  unregisterCSSTransition: jest.fn(),
  runCSSTransition: jest.fn(),
}));

const lastPlatformFlag = () => {
  const { calls } = (runCSSTransition as jest.Mock).mock;
  return calls[calls.length - 1]?.[3];
};

// Runs in the ios jest project: a border transition keeps the platform off until it ends.
describe('CSSTransitionsManager (iOS) border transitions', () => {
  const shadowNodeWrapper = {} as ShadowNodeWrapper;
  const CONFIG = {
    transitionProperty: 'all',
    transitionDuration: '300ms',
  } as const;
  let manager: CSSTransitionsManager;
  let now: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, 1);
    now = jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    now.mockRestore();
  });

  test('keeps the platform off while a border transition runs', () => {
    manager.update(CONFIG, { borderWidth: 4, backgroundColor: 'red' });
    manager.update(CONFIG, { borderWidth: 0, backgroundColor: 'red' });

    now.mockReturnValue(1200);
    manager.update(
      CONFIG,
      { borderWidth: 0, backgroundColor: 'blue' },
      0,
      true
    );
    expect(lastPlatformFlag()).toBe(false);

    now.mockReturnValue(1300);
    manager.update(CONFIG, { borderWidth: 0, backgroundColor: 'red' }, 0, true);
    expect(lastPlatformFlag()).toBe(true);
  });

  test('does not touch the platform for other properties', () => {
    manager.update(CONFIG, { backgroundColor: 'red' });
    manager.update(CONFIG, { backgroundColor: 'blue' });

    now.mockReturnValue(1100);
    manager.update(CONFIG, { backgroundColor: 'red' }, 0, true);
    expect(lastPlatformFlag()).toBe(true);
  });
});
