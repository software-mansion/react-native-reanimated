type DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: boolean;
  updateFlag(name: DynamicFlagName, value: boolean): void;
};
type DynamicFlagName = keyof Omit<DynamicFlagsType, 'updateFlag'>;

const DynamicFlags: DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: true,

  updateFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
    } else {
      console.warn(`[Reanimated] The feature flag: '${name}' no longer exists, you can safely remove invocation of \`updateFeatureFlag('${name}')\` from your code.`);
    }
  }
};

// Public API function to update a feature flag
export function updateFeatureFlag(name: DynamicFlagName, value: boolean): void {
  DynamicFlags.updateFlag(name, value);
}

export default DynamicFlags;
