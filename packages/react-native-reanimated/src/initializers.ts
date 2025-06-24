'use strict';
import { IS_WEB } from './common';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (IS_WEB) {
    return;
  }
  if (!ReanimatedModule) {
    throw new ReanimatedError(
      'Tried to initialize Reanimated without a valid ReanimatedModule'
    );
  }
}
