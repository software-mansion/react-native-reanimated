/* eslint-disable no-var */
export {};

declare global {
  /** This global variable is a diagnostic/development tool.
   * It used to be necessary in the past for some of the
   * functionalities of react-native-reanimated to work
   * properly but it's no longer the case. Your code
   * shouldn't depend on it, we keep it here
   * mainly for backward compatibility reasons for our users.
   */
  var _WORKLET: boolean | undefined;

  /** This is simply an address of UI Runtime. Its type stems from
   * the need to be able to pass it from the native side to JS
   * when it's a 64-bit address value.
   */
  var _WORKLET_RUNTIME: ArrayBuffer;
}
