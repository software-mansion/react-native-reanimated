export {};

type WorkletsModule = { prepareBundleMode?: () => boolean } | null | undefined;

declare global {
  var __DEV__: boolean;

  var __fbBatchedBridgeConfig: unknown;

  var __RUNTIME_KIND: 1 | 2 | 3 | undefined;

  var _WORKLETS_BUNDLE_MODE_ENABLED: boolean | undefined;

  var __turboModuleProxy: ((name: string) => WorkletsModule) | undefined;

  var nativeModuleProxy: Record<string, WorkletsModule> | undefined;
}
