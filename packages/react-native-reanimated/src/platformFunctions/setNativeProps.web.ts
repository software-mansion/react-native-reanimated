'use strict';
import type { ComponentWithInstanceMethods, StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

export function setNativeProps<TComponent extends ComponentWithInstanceMethods>(
  animatedRef: AnimatedRef<TComponent>,
  updates: StyleProps
) {
  const component = animatedRef() as ReanimatedHTMLElement;
  _updatePropsJS(updates, component);
}
