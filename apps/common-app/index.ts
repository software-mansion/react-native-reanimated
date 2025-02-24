/* eslint-disable no-var */
/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-underscore-dangle */

// This detection mechanism is necessary for the time being for dynamic
// resolution of worklets. `react-native-worklets` is present in monorepo's
// node_modules therefore allowed to be imported though it's not a dependency.
let hasExternalWorklets = false;
try {
  const packageJson = require('./package.json') as Record<
    string,
    Record<string, unknown>
  >;
  hasExternalWorklets =
    packageJson?.dependencies?.['react-native-worklets'] !== undefined ||
    packageJson?.devDependencies?.['react-native-worklets'] !== undefined;
} catch (_e) {
  // Do nothing.
}

declare global {
  var __DISALLOW_WORKLETS_IMPORT: boolean | undefined;
}

globalThis.__DISALLOW_WORKLETS_IMPORT = !hasExternalWorklets;

// Has to be imported dynamically to inject __DISALLOW_WORKLETS_IMPORT before
// any other code is executed.
const App = require('@/App').default;

export default App;
