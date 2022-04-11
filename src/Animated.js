import createAnimatedComponent from './createAnimatedComponent';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';
import * as reanimated1 from './reanimated1';
import ReanimatedComponents from './reanimated2/component';

const Animated = {
  // components
  ...ReanimatedComponents,
  createAnimatedComponent,
  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
  // reanimated 1
  ...reanimated1,
};

export * from './reanimated2';
export * from './reanimated1';
export default Animated;
