import { isWeb } from './PlatformChecker';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (isWeb()) {
    return;
  }
  if (!ReanimatedModule) {
    throw new ReanimatedError(
      'Tried to initialize Reanimated without a valid ReanimatedModule'
    );
  }
}
