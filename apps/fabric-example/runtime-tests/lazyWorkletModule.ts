import { getRuntimeKind } from 'react-native-worklets';

// Used by the `worklets from a lazy chunk` runtime test in
// `apps/common-app/runtime-tests/worklets/tests/runtimes/lazyChunkWorklets.test.ts`.
// It lives in fabric-example for the same reason as `lazyImportModule.ts`.
export function describeRuntime(label: string) {
  'worklet';
  return `${label}:${getRuntimeKind()}`;
}

export function initializeLazyRuntime() {
  'worklet';
  (globalThis as Record<string, unknown>).__lazyInitializerRanOn =
    getRuntimeKind();
}
