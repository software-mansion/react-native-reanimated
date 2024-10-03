'use strict';
import type { StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';

export function setNativeProps<T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) {
  const component = animatedRef() as ReanimatedHTMLElement;
  _updatePropsJS(updates, component);
}
