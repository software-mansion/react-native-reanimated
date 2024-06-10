'use strict';
import reanimatedJS from '../js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { NativeReanimated } from './NativeReanimated';

export default shouldBeUseWeb() ? reanimatedJS : new NativeReanimated();
