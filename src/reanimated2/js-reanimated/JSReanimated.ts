import { NativeReanimated } from '../NativeReanimated/NativeReanimated';
import { Timestamp, ShareableRef } from '../commonTypes';
import { isJest } from '../PlatformChecker';

export default class JSReanimated extends NativeReanimated {
  _valueUnpacker?: <T>(value: T) => void = undefined;

  _renderRequested = false;
  _frames: ((timestamp: Timestamp) => void)[] = [];
  timeProvider: { now: () => number };

  constructor() {
    super(false);
    if (isJest()) {
      this.timeProvider = { now: () => global.ReanimatedDataMock.now() };
    } else {
      this.timeProvider = { now: () => window.performance.now() };
    }
  }

  getTimestamp(): number {
    return this.timeProvider.now();
  }

  makeShareableClone<T>(value: T): ShareableRef<T> {
    return { __hostObjectShareableJSRef: value };
  }

  installCoreFunctions(valueUnpacker: <T>(value: T) => T): void {
    this._valueUnpacker = valueUnpacker;
  }

  scheduleOnUI<T>(worklet: ShareableRef<T>) {
    // @ts-ignore web implementation has still not been updated after the rewrite, this will be addressed once the web implementation updates are ready
    return requestAnimationFrame(worklet);
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

  jestResetModule() {
    if (isJest()) {
      /**
       * If someone used timers to stop animation before the end,
       * then _renderRequested was set as true
       * and any new update from another test wasn't applied.
       */
      this._renderRequested = false;
    } else {
      throw Error('This method can be only use in Jest testing.');
    }
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
