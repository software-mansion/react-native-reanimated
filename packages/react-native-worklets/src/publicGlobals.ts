'use strict';
/* eslint-disable reanimated/use-global-this */
export {};

declare global {
  /**
   * This global variable is a diagnostic/development tool.
   *
   * It is `true` on the UI thread and `false` on the JS thread.
   *
   * It used to be necessary in the past for some of the functionalities of
   * react-native-reanimated to work properly but it's no longer the case. Your
   * code shouldn't depend on it, we keep it here mainly for backward
   * compatibility for our users.
   */
  var _WORKLET: boolean | undefined;

  /**
   * This ArrayBuffer contains the memory address of `jsi::Runtime` which is the
   * Reanimated UI runtime.
   */
  var _WORKLET_RUNTIME: ArrayBuffer;

  /** @deprecated Don't use. */
  var _IS_FABRIC: boolean | undefined;
}
