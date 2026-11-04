import { getRuntimeKind } from 'react-native-worklets';

// Used by the `lazy import()` runtime test in
// `apps/common-app/runtime-tests/worklets/tests/runtimes/lazyImport.test.ts`.
// It lives in fabric-example, not in common-app, because Metro builds lazy
// chunk URLs relative to the server root, which is this app. A module outside
// of it gets a `/../common-app/...` chunk path that URL normalization breaks.
export const evaluatedOn = getRuntimeKind();
