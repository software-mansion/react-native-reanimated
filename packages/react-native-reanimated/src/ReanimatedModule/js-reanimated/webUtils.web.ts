'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createReactDOMStyle: (style: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTransformValue: (transform: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTextShadowValue: (style: any) => void | string;

// react-native-web exposes these style helpers only through internal modules.
// Metro (and other CommonJS bundlers) provide require(), so we keep loading them
// synchronously there - the previous behavior is left untouched. Strict ESM
// bundlers (webpack, Rollup, esbuild) don't define require() inside ESM modules,
// which left the helpers undefined and made _updatePropsJS crash on every frame
// (#9844); there we fall back to a dynamic import(). The CommonJS build
// (dist/cjs) is imported because SSR frameworks load an externalized
// react-native-web with Node's ESM resolver, which rejects the extensionless
// relative imports inside its ESM build (dist/exports). If neither loader
// resolves the helpers they stay undefined and the DOM update branch is skipped,
// exactly like on native.

let loadedSynchronously = false;

if (typeof require === 'function') {
  try {
    createReactDOMStyle =
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
      require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
    loadedSynchronously = createReactDOMStyle !== undefined;
    // eslint-disable-next-line no-empty
  } catch (_e) {}

  try {
    // React Native Web 0.19+
    createTransformValue =
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
      require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
    // eslint-disable-next-line no-empty
  } catch (_e) {}

  try {
    createTextShadowValue =
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
      require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
    // eslint-disable-next-line no-empty
  } catch (_e) {}
}

if (!loadedSynchronously) {
  // A CommonJS default export comes through as `.default` under Node's ESM
  // interop and under bundlers; a bare `module.exports = fn` build comes through
  // as the namespace itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interopDefault = (moduleExports: any) =>
    moduleExports?.default ?? moduleExports;

  void (async () => {
    try {
      const styleModule = await import(
        // eslint-disable-next-line n/no-unpublished-import
        'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js'
      );
      createReactDOMStyle = interopDefault(styleModule);
    } catch (_e) {
      // react-native-web internals could not be resolved; the DOM update branch
      // stays disabled, exactly like on native.
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
    } catch (_e) {
      // Optional helpers; leaving them undefined just skips the transform and
      // textShadow conversions.
    }
  })();
}
