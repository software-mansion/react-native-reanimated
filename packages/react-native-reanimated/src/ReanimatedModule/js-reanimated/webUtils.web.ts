'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createReactDOMStyle: (style: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTransformValue: (transform: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTextShadowValue: (style: any) => void | string;

// react-native-web exposes these style helpers only via internal modules. Metro
// has require() so we load them synchronously; strict-ESM bundlers and SSR don't,
// so require() throws and we fall back to import()ing the dist/cjs build
// (dist/exports' extensionless imports fail Node's ESM resolver). If neither
// resolves, the helpers stay undefined and the DOM update is skipped, so those
// styles just aren't applied (no crash).
//
// Kept as a single top-level try/catch (no top-level `if` or IIFE) so the module
// stays tree-shakable - see the is-tree-shakable check.
try {
  createReactDOMStyle =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
    require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
  // React Native Web 0.19+
  const preprocess =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
    require('react-native-web/dist/exports/StyleSheet/preprocess');
  createTransformValue = preprocess.createTransformValue;
  createTextShadowValue = preprocess.createTextShadowValue;
} catch (_e) {
  // No require() (strict ESM / SSR), or a helper module was missing: load the
  // helpers from the dist/cjs build instead.
  void (async () => {
    // The cjs export may arrive as `.default` (bundler/Node interop) or as the
    // namespace itself; handle both.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interopDefault = (moduleExports: any) =>
      moduleExports?.default ?? moduleExports;

    try {
      const styleModule = await import(
        // eslint-disable-next-line n/no-unpublished-import
        'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js'
      );
      createReactDOMStyle = interopDefault(styleModule);
    } catch (_e2) {
      // Unresolved: the DOM update is skipped, so these styles aren't applied.
    }

    try {
      const preprocessModule = await import(
        // eslint-disable-next-line n/no-unpublished-import
        'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js'
      );
      // React Native Web 0.19+
      const preprocess = interopDefault(preprocessModule);
      createTransformValue = preprocess.createTransformValue;
      createTextShadowValue = preprocess.createTextShadowValue;
    } catch (_e2) {
      // Optional: leaving them undefined just skips transform/textShadow.
    }
  })();
}
