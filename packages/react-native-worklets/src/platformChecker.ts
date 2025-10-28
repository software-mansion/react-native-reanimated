'use strict';

import { Platform } from 'react-native';

export const IS_JEST: boolean = !!process.env.JEST_WORKER_ID;
export const IS_WEB: boolean = Platform.OS === 'web';
export const IS_WINDOWS: boolean = Platform.OS === 'windows';
export const SHOULD_BE_USE_WEB: boolean = IS_JEST || IS_WEB || IS_WINDOWS;
