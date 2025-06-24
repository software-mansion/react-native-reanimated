type DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: boolean;
  setFlag(name: DynamicFlagName, value: boolean): void;
};
type DynamicFlagName = keyof Omit<DynamicFlagsType, 'setFlag'>;

// ts-prune-ignore-next
export const DynamicFlags: DynamicFlagsType = {
  TEST_DYNAMIC_FLAG: true,

  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
    } else {
      console.warn(
        `[Reanimated] The feature flag: '${name}' no longer exists, you can safely remove invocation of \`setFeatureFlag('${name}')\` from your code.`
      );
    }
  },
};

// Public API function to update a feature flag
export function setFeatureFlag(name: DynamicFlagName, value: boolean): void {
  DynamicFlags.setFlag(name, value);
}

// ts-prune-ignore-next
export default DynamicFlags;
