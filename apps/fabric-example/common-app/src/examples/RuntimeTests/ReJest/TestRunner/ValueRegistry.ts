import { makeMutable } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { SharedValueSnapshot, TestValue } from '../types';
import { SyncUIRunner } from '../utils/SyncUIRunner';

export class ValueRegistry {
  private _valueRegistry: Record<string, SharedValue> = {};
  private _syncUIRunner = new SyncUIRunner();

  public registerValue<TValue = unknown>(name: string, value: SharedValue<TValue>) {
    'worklet';
    this._valueRegistry[name] = value as SharedValue;
  }

  public async getRegisteredValue(name: string): Promise<SharedValueSnapshot> {
    const jsValue = this._valueRegistry[name].value;
    const sharedValue = this._valueRegistry[name];
    const valueContainer = makeMutable<unknown>(null);
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      valueContainer.value = sharedValue.value;
    }, 1000);
    const uiValue = valueContainer.value;
    return {
      name,
      onJS: jsValue as TestValue,
      onUI: uiValue as TestValue,
    };
  }
}
