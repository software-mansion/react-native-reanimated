import { NativeReanimated } from '../NativeReanimated/NativeReanimated';
import { ShareableRef } from '../commonTypes';
import { isJest } from '../PlatformChecker';

export default class JSReanimated extends NativeReanimated {
  constructor() {
    super(false);
    if (isJest()) {
      // on node < 16 jest have problems mocking performance.now method which
      // results in the tests failing, since date precision isn't that important
      // for tests, we use Date.now instead
      this.getTimestamp = () => Date.now();
    } else {
      this.getTimestamp = () => window.performance.now();
    }
  }

  makeShareableClone<T>(value: T): ShareableRef<T> {
    return { __hostObjectShareableJSRef: value };
  }

  installCoreFunctions(
    _callGuard: <T extends Array<any>, U>(
      fn: (...args: T) => U,
      ...args: T
    ) => void,
    _valueUnpacker: <T>(value: T) => T
  ): void {
    // noop
  }

  scheduleOnUI<T>(worklet: ShareableRef<T>) {
    // @ts-ignore web implementation has still not been updated after the rewrite, this will be addressed once the web implementation updates are ready
    requestAnimationFrame(worklet);
  }

  registerEventHandler<T>(
    _eventHash: string,
    _eventHandler: ShareableRef<T>
  ): string {
    // noop
    return '';
  }

  unregisterEventHandler(_: string): void {
    // noop
  }

  enableLayoutAnimations() {
    console.warn(
      '[Reanimated] enableLayoutAnimations is not available for WEB yet'
    );
  }

  registerSensor(): number {
    console.warn('[Reanimated] useAnimatedSensor is not available on web yet.');
    return -1;
  }

  unregisterSensor(): void {
    // noop
  }

  subscribeForKeyboardEvents(_: ShareableRef<number>): number {
    console.warn(
      '[Reanimated] useAnimatedKeyboard is not available on web yet.'
    );
    return -1;
  }

  unsubscribeFromKeyboardEvents(_: number): void {
    // noop
  }
}
