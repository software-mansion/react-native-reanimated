'use strict';
import type { ReanimatedHTMLElement } from 'react-native-worklets';
import { _updatePropsJS } from 'react-native-worklets';
import type { StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

export function setNativeProps<T extends Component>(
  animatedRef: AnimatedRef<T>,
  updates: StyleProps
) {
  const component = animatedRef() as ReanimatedHTMLElement;
  _updatePropsJS(updates, component);
}
