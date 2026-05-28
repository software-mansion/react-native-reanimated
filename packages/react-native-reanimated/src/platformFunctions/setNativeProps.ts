'use strict';
import type { InstanceOrElement, StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

// Constraint matches the native signature (`InstanceOrElement`, wider than
// `InternalHostInstance`) so consumer types stay consistent across platforms
// even though the runtime impl only touches DOM-shaped refs.
export function setNativeProps<TRef extends InstanceOrElement>(
  animatedRef: AnimatedRef<TRef>,
  updates: StyleProps
) {
  const component = animatedRef() as ReanimatedHTMLElement;
  _updatePropsJS(updates, component);
}
