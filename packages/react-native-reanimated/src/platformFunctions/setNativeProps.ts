'use strict';
import type { InstanceOrElement, StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

export function setNativeProps<TRef extends InstanceOrElement>(
  animatedRef: AnimatedRef<TRef>,
  updates: StyleProps
) {
  const component = animatedRef() as ReanimatedHTMLElement;
  _updatePropsJS(updates, component);
}
