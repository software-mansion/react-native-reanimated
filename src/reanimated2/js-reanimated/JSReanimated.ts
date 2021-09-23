import MapperRegistry from './MapperRegistry';
import MutableValue from './MutableValue';
import Mapper from './Mapper';
import { NativeReanimated } from '../NativeReanimated/NativeReanimated';
import {
  AnimationObject,
  PrimitiveValue,
  Timestamp,
} from '../animation/commonTypes';
import { Descriptor } from '../hook/commonTypes';

export default class JSReanimated extends NativeReanimated {
  _valueSetter?: (
    value:
      | (() => AnimationObject)
      | AnimationObject
      | PrimitiveValue
      | Descriptor
  ) => void = undefined;

  _renderRequested = false;
  _mapperRegistry = new MapperRegistry(this);
  _frames: ((timestamp: Timestamp) => void)[] = [];
  timeProvider: { now: () => number };

  constructor() {
    super(false);
    if (process.env.JEST_WORKER_ID) {
      this.timeProvider = { now: () => Date.now() };
    } else {
      this.timeProvider = { now: () => window.performance.now() };
    }
  }

  pushFrame(frame: (timestamp: Timestamp) => void): void {
    this._frames.push(frame);
    this.maybeRequestRender();
  }

  getTimestamp(): number {
    return this.timeProvider.now();
  }

  maybeRequestRender(): void {
    if (!this._renderRequested) {
      this._renderRequested = true;

      requestAnimationFrame((_timestampMs) => {
        this._renderRequested = false;

        this._onRender(this.getTimestamp());
      });
    }
  }

  _onRender(timestampMs: number): void {
    this._mapperRegistry.execute();

    const frames = [...this._frames];
    this._frames = [];

    for (let i = 0, len = frames.length; i < len; ++i) {
      frames[i](timestampMs);
    }

    if (this._mapperRegistry.needRunOnRender) {
      this._mapperRegistry.execute();
    }
  }

  installCoreFunctions(
    valueSetter: (
      value:
        | (() => AnimationObject)
        | AnimationObject
        | PrimitiveValue
        | Descriptor
    ) => void
  ): void {
    this._valueSetter = valueSetter;
  }

  makeShareable<T>(value: T): T {
    return value;
  }

  makeMutable<T>(value: T): MutableValue {
    return new MutableValue(value, this._valueSetter);
  }

  makeRemote<T>(object = {}): T {
    return object as T;
  }

  startMapper(
    mapper: () => void,
    inputs: any[] = [],
    outputs: any[] = []
  ): number {
    const instance = new Mapper(this, mapper, inputs, outputs);
    const mapperId = this._mapperRegistry.startMapper(instance);
    this.maybeRequestRender();
    return mapperId;
  }

  stopMapper(mapperId: number): void {
    this._mapperRegistry.stopMapper(mapperId);
  }

  registerEventHandler<T>(_: string, __: (event: T) => void): string {
    // noop
    return '';
  }

  unregisterEventHandler(_: string): void {
    // noop
  }
}
