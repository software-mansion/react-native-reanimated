'use strict';
import { logger } from '../common';
import { ReanimatedModule } from '../ReanimatedModule';

type DynamicFlagsType = {
  EXPERIMENTAL_MUTABLE_OPTIMIZATION: boolean;
  init(): void;
  setFlag(name: DynamicFlagName, value: boolean): void;
};
type DynamicFlagName = keyof Omit<Omit<DynamicFlagsType, 'setFlag'>, 'init'>;

/** @knipIgnore */
export const DynamicFlags: DynamicFlagsType = {
  EXPERIMENTAL_MUTABLE_OPTIMIZATION: false,

  init() {
    Object.keys(DynamicFlags).forEach((key) => {
      if (key !== 'init' && key !== 'setFlag') {
        ReanimatedModule.setDynamicFeatureFlag(
          key,
          DynamicFlags[key as DynamicFlagName]
        );
      }
    });
  },
  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
      ReanimatedModule.setDynamicFeatureFlag(name, value);
    } else {
      logger.warn(
        `The feature flag: '${name}' no longer exists, you can safely remove invocation of \`setDynamicFeatureFlag('${name}')\` from your code.`
      );
    }
  },
};
DynamicFlags.init();

// Public API function to update a feature flag
export function setDynamicFeatureFlag(
  name: DynamicFlagName,
  value: boolean
): void {
  DynamicFlags.setFlag(name, value);
}
