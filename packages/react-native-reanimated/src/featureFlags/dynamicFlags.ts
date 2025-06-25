'use strict';
import { ReanimatedModule } from '../ReanimatedModule';

type DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: boolean;
  init(): void;
  setFlag(name: DynamicFlagName, value: boolean): void;
};
type DynamicFlagName = keyof Omit<Omit<DynamicFlagsType, 'setFlag'>, 'init'>;

// ts-prune-ignore-next
export const DynamicFlags: DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: true,

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
      console.warn(
        `[Reanimated] The feature flag: '${name}' no longer exists, you can safely remove invocation of \`setDynamicFeatureFlag('${name}')\` from your code.`
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

// ts-prune-ignore-next
export default DynamicFlags;
