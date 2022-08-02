// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';

/**
 * We need to augment react types because rn for web provides non-standard way of measuring components by injecting `measure` method to the ref.
 *
 * Reference:
 * https://github.com/necolas/react-native-web/blob/c47bec7b93d6a3b7c31bbc8bb2e4acd117b79bfc/packages/react-native-web/src/modules/usePlatformMethods/index.js#L69
 * https://github.com/necolas/react-native-web/blob/c47bec7b93d6a3b7c31bbc8bb2e4acd117b79bfc/packages/react-native-web/src/exports/UIManager/index.js#L63
 *  */

/* eslint-disable @typescript-eslint/no-namespace */
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/ban-types
  interface Component {
    measure?(
      callback: (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => void
    ): void;
  }
}
