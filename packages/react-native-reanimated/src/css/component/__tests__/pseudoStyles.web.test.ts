'use strict';
import type { HostInstance } from 'react-native';

import type { PseudoStylesConfig } from '../../types';
import { setPseudoStyles } from '../pseudoStyles';

const PRESSED_CONFIG: PseudoStylesConfig = {
  defaultStyle: { opacity: 1 },
  selectors: [{ selector: ':active', style: { opacity: 0.5 } }],
};

// The effect the docs show: register on mount, release in the cleanup.
function pressedStateEffect(view: HostInstance) {
  setPseudoStyles(view, PRESSED_CONFIG);
  return () => setPseudoStyles(view, null);
}

describe('setPseudoStyles (web)', () => {
  test('warns once across an effect that registers, releases and registers again', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    const view = {} as HostInstance;

    const cleanup = pressedStateEffect(view);
    cleanup();
    pressedStateEffect(view)();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[Reanimated] setPseudoStyles() is not supported on web, where these states are styled with CSS.'
    );
    warn.mockRestore();
  });
});
