'use strict';

import type { HostComponent } from 'react-native';

import { shouldBeUseWeb } from '../PlatformChecker';

let ReanimatedNativeView: HostComponent<any>;
if (shouldBeUseWeb()) {
  // this is a workaround for the web, nextjs and jest
  ReanimatedNativeView = {} as HostComponent<any>;
} else {
  ReanimatedNativeView = require('./ReanimatedNativeComponent').default;
}

export default ReanimatedNativeView;
