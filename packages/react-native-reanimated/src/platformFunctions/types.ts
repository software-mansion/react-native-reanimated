'use strict';

import type { InstanceOrElement } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

export type DispatchCommand = <TRef extends InstanceOrElement>(
  animatedRef: AnimatedRef<TRef>,
  commandName: string,
  args?: unknown[]
) => void;
