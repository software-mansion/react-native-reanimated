export function getMethodMap() {
  'worklet';
  return {
    topLevel: (callback: () => void) => callback(),
    setTimeout,
    setImmediate,
    requestAnimationFrame,
    queueMicrotask,
    setInterval: (callback: () => void) => {
      const handle = setInterval(() => {
        callback();
        clearInterval(handle);
      });
    },
  };
}

export type MethodsName = keyof ReturnType<typeof getMethodMap>;
export type TwoMethodsConfig = [MethodsName, number, MethodsName, number, string];
export type ThreeMethodsConfig = [MethodsName, number, MethodsName, number, MethodsName, number, string];

/**
 * Wrapping data with the `incorrect` decorator indicates that the test configuration
 * doesn't adhere to the Web specification for Event Loop execution order. For example,
 * the UI runtime doesn't follow that specification.
 *
 * The method accepts two configurations:
 * @param incorrectConfig - A config that doesn't follow the Web specification
 * for Event Loop execution order but describes the current behavior on the Runtime.
 * @param correctConfig - A config that follows the Web specification for
 * Event Loop execution order.
 * @returns The received `incorrectConfig`
 */
export function incorrect<T>(incorrectConfig: T, _correctConfig: T) {
  return incorrectConfig;
}
