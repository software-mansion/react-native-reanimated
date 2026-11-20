'use strict';
import type { HostInstance } from 'react-native';

import type { UnknownRecord } from '../../common';
import {
  getCompoundComponentName,
  getPropsBuilder,
  IS_JEST,
} from '../../common';
import type {
  InternalHostInstance,
  ShadowNodeWrapper,
} from '../../commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import CSSPseudoStylesManager from '../native/managers/CSSPseudoStylesManager';
import { markNodeAsRemovable, unmarkNodeAsRemovable } from '../native/proxy';
import type { PseudoStylesInput } from '../native/types';
import type { PseudoStylesConfig } from '../types';

type HostRegistration = {
  manager: CSSPseudoStylesManager;
  shadowNodeWrapper: ShadowNodeWrapper;
  viewTag: number;
  isRemovable: boolean;
};

const registrations = new WeakMap<object, HostRegistration>();

/**
 * Styles a host component by its `:active`, `:hover` and `:focus` states on the
 * UI thread, as pseudo values do on a component Reanimated wraps. Call it again
 * whenever the config changes, and with `null` when the view unmounts.
 */
export function setPseudoStyles(
  instance: HostInstance,
  config: PseudoStylesConfig | null
): void {
  // Jest renders host components without a shadow tree to register on.
  if (IS_JEST) {
    return;
  }
  const registration = registrations.get(instance);
  if (config === null) {
    if (registration && !registration.isRemovable) {
      registration.manager.unmountCleanup();
      // The node can come back, as a hidden `Activity` does, so its registries
      // are cleared only once it leaves the shadow tree.
      markNodeAsRemovable(registration.shadowNodeWrapper);
      registration.isRemovable = true;
    }
    return;
  }

  const current = registration ?? registerHost(instance);
  if (current.isRemovable) {
    unmarkNodeAsRemovable(current.viewTag);
    current.isRemovable = false;
  }
  current.manager.updateInput(
    pseudoStylesInputFromConfig(config),
    config.transition ?? null
  );
}

function registerHost(instance: InternalHostInstance): HostRegistration {
  const { reactViewName = 'RCTView', viewTag } = getViewInfo(instance);
  if (viewTag === undefined) {
    throw new Error(
      '[Reanimated] `setPseudoStyles` takes the instance of a host component, such as the ref of a `View`.'
    );
  }
  const shadowNodeWrapper = getShadowNodeWrapperFromRef(instance);
  const compoundComponentName = getCompoundComponentName(reactViewName, '');
  const registration: HostRegistration = {
    manager: new CSSPseudoStylesManager(
      shadowNodeWrapper,
      viewTag,
      getPropsBuilder(compoundComponentName),
      compoundComponentName
    ),
    shadowNodeWrapper,
    viewTag,
    isRemovable: false,
  };
  registrations.set(instance, registration);
  return registration;
}

function pseudoStylesInputFromConfig({
  defaultStyle,
  selectors = [],
  hostsGroup,
}: PseudoStylesConfig): PseudoStylesInput {
  // A styled property with no resting value rests at null, which is what React renders.
  const restingStyle: UnknownRecord = { ...defaultStyle };
  for (const { style } of selectors) {
    for (const property of Object.keys(style)) {
      if (!Object.prototype.hasOwnProperty.call(restingStyle, property)) {
        restingStyle[property] = undefined;
      }
    }
  }
  return {
    defaultStyle: restingStyle,
    selectors: selectors.map(({ selector, group, style }) => ({
      selector,
      group,
      selectorStyle: { ...style },
    })),
    hostsGroup,
  };
}
