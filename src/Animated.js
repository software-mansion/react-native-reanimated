import createAnimatedComponent from './createAnimatedComponent';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';

import * as ReanimatedComponents from './reanimated2/component';

const Animated = {
  // components
  ...ReanimatedComponents,
  createAnimatedComponent,
  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
};

export {
  // components
  createAnimatedComponent,
  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
};
export * from './reanimated2';
export default Animated;
