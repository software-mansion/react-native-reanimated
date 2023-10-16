'use strict';
import { _updatePropsJS } from '../js-reanimated';
import type { StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

export function setNativeProps<T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) {
  const component = (animatedRef as any)();
  _updatePropsJS(updates, { _component: component });
}
