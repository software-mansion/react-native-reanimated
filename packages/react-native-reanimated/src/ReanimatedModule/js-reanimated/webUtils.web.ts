'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createReactDOMStyle: (style: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTransformValue: (transform: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTextShadowValue: (style: any) => void | string;

// react-native-web exposes these style helpers only via internal modules. Metro
// has require() so we load them synchronously (unchanged); strict-ESM bundlers
// and SSR don't, which left them undefined and crashed _updatePropsJS (#9844), so
// there we import() the dist/cjs build instead (dist/exports' extensionless
// imports fail Node's ESM resolver). If neither resolves, the helpers stay
// undefined and the DOM branch is skipped, as on native.

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
  // The cjs export may arrive as `.default` (bundler/Node interop) or as the
  // namespace itself; handle both.
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
      // Unresolved: the DOM update branch stays disabled, as on native.
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
      // Optional: leaving them undefined just skips transform/textShadow.
    }
  })();
}
