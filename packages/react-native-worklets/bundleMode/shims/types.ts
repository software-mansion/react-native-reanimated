export {};

declare global {
  var __workletsModuleProxy: {
    getStaticFeatureFlag: (name: string) => boolean;
  };

  var __fbBatchedBridgeConfig: unknown;

  var __RUNTIME_KIND: 1 | 2 | 3 | undefined;

  var TurboModules: Map<string, unknown> | undefined;
}
