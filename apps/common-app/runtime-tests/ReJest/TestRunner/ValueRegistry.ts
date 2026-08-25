import type { SharedValue } from 'react-native-reanimated';

import type { TestValue } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';

export class ValueRegistry {
  private _valueRegistry: Record<string, SharedValue> = {};

  public registerValue<TValue = unknown>(
    name: string,
    value: SharedValue<TValue>
  ) {
    this._valueRegistry[name] = value as SharedValue;
  }

  public peekOnJS<TValue extends TestValue>(name: string): TValue {
    return this._valueRegistry[name].value as TValue;
  }

  public async getOnJS<TValue extends TestValue>(
    name: string
  ): Promise<TValue> {
    await runOnUIBlocking(
      () => {
        'worklet';
      },
      1000,
      `the UI runtime to drain before reading '${name}' on the JS runtime`
    );
    return this._valueRegistry[name].value as TValue;
  }

  public async getOnUI<TValue extends TestValue>(
    name: string
  ): Promise<TValue> {
    const sharedValue = this._valueRegistry[name];
    const uiValue = await runOnUIBlocking(
      () => {
        'worklet';
        return sharedValue.value;
      },
      1000,
      `the UI runtime to report the value of '${name}'`
    );
    return uiValue as TValue;
  }
}
