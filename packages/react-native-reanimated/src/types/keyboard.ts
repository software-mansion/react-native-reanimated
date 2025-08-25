'use strict';

import type { SharedValue } from './values';

export enum KeyboardState {
  UNKNOWN = 0,
  OPENING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
}

export type AnimatedKeyboardInfo = {
  height: SharedValue<number>;
  state: SharedValue<KeyboardState>;
};

export interface AnimatedKeyboardOptions {
  isStatusBarTranslucentAndroid?: boolean;
  isNavigationBarTranslucentAndroid?: boolean;
}
