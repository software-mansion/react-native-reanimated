'use strict';
import { _updatePropsJS } from './js-reanimated';
import type { StyleProps } from './commonTypes';
import type { AnimatedRef } from './hook/commonTypes';
import type { Component } from 'react';

export const setNativeProps: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) => void = (_animatedRef, _updates) => {
  const component = (_animatedRef as any)();
  _updatePropsJS(_updates, { _component: component });
};
