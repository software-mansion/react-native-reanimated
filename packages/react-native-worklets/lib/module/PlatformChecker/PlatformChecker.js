'use strict';

import { Platform } from 'react-native';
export const IS_JEST = !!process.env.JEST_WORKER_ID;
export const IS_WEB = Platform.OS === 'web';
export const IS_WINDOWS = Platform.OS === 'windows';
export const SHOULD_BE_USE_WEB = IS_JEST || IS_WEB || IS_WINDOWS;
//# sourceMappingURL=PlatformChecker.js.map