'use strict';

import type { HostComponent } from 'react-native';

import { shouldBeUseWeb } from '../PlatformChecker';

let ReanimatedNativeView: HostComponent<any>;
if (shouldBeUseWeb()) {
  // this is a workaround for the jest
  ReanimatedNativeView = {} as HostComponent<any>;
} else {
  ReanimatedNativeView = require('./ReanimatedNativeComponent').default;
}

// ts-prune-ignore-next-line
export default ReanimatedNativeView;
