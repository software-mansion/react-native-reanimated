import type { SharedValue } from 'react-native-reanimated';

import type { SharedValueSnapshot, TestValue } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';

export class ValueRegistry {
  private _valueRegistry: Record<string, SharedValue> = {};

  public registerValue<TValue = unknown>(
    name: string,
    value: SharedValue<TValue>
  ) {
    'worklet';
    this._valueRegistry[name] = value as SharedValue;
  }

  public async getRegisteredValue<TValue extends TestValue>(
    name: string
  ): Promise<SharedValueSnapshot<TValue>> {
    const sharedValue = this._valueRegistry[name];
    const uiValue = await runOnUIBlocking(
      () => {
        'worklet';
        return sharedValue.value;
      },
      1000,
      `the UI runtime to report the value of '${name}'`
    );
    const jsValue = sharedValue.value;

    return {
      onJS: jsValue as TValue,
      onUI: uiValue as TValue,
    };
  }
}
