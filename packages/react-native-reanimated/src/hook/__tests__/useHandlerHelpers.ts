'use strict';
import { Platform } from 'react-native';

import { ReanimatedError } from '../../common';
import { worklet } from '../../jestUtils';
import { useHandler } from '../useHandler';

const renderHook =
  Platform.OS === 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('@testing-library/react').renderHook
    : // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('@testing-library/react-native').renderHook;

export function createUseHandlerError(
  handlerNames: string | string[],
  isWeb: boolean
): ReanimatedError {
  const names =
    typeof handlerNames === 'string' ? handlerNames : handlerNames.join(', ');
  const handlerList = `Handlers "${names}" are not worklets.`;

  if (isWeb) {
    return new ReanimatedError(
      `Passed handlers that are not worklets. Please provide a dependency array to use non-worklet handlers or pass only worklet functions. ${handlerList}`
    );
  }

  return new ReanimatedError(
    `Passed handlers that are not worklets. Only worklet functions are allowed. ${handlerList}`
  );
}

export function createHandlers() {
  const worklet1 = worklet();
  const worklet2 = worklet();
  return {
    worklets: { worklet1, worklet2 },
    handlers: {
      onScroll: worklet1,
      onPress: worklet2,
    },
  };
}

export function renderHookWithHandlers(
  handlers: Record<string, unknown>,
  dependencies?: unknown[]
) {
  return renderHook(
    ({
      handlers: h,
      deps,
    }: {
      handlers: Record<string, unknown>;
      deps?: unknown[];
    }) => useHandler(h as Parameters<typeof useHandler>[0], deps),
    {
      initialProps: { handlers, deps: dependencies },
    }
  );
}
