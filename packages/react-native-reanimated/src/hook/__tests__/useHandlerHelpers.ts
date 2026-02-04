'use strict';
import { renderHook } from '@testing-library/react-native';

import { ReanimatedError } from '../../common';
import { worklet } from '../../jestUtils';
import { useHandler } from '../useHandler';

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
