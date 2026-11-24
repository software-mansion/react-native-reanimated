import {
  abortWorkletRuntime,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId,
  scheduleOnRuntimeWithId,
} from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

type InvalidRuntimeIdCase = [
  description: string,
  runtimeId: unknown,
  message: string,
];

const INVALID_RUNTIME_IDS: InvalidRuntimeIdCase[] = [
  ['a string', 'one', 'Runtime id must be a number.'],
  ['undefined', undefined, 'Runtime id must be a number.'],
  ['NaN', NaN, 'Runtime id must be a finite number.'],
  ['Infinity', Infinity, 'Runtime id must be a finite number.'],
  ['a fraction', 1.5, 'Runtime id must be an integer.'],
  ['a negative number', -1, 'Runtime id must not be negative.'],
  ['2^64', 2 ** 64, 'Runtime id must be smaller than 2^64.'],
];

const noop = () => {
  'worklet';
};

describe('runtime id validation', () => {
  test.each(INVALID_RUNTIME_IDS)(
    'abortWorkletRuntime throws for %s',
    async ([_description, runtimeId, message]: InvalidRuntimeIdCase) => {
      await expect(() => {
        abortWorkletRuntime(runtimeId as unknown as number);
      }).toThrow(message);
    }
  );

  test.each(INVALID_RUNTIME_IDS)(
    'scheduleOnRuntimeWithId throws for %s',
    async ([_description, runtimeId, message]: InvalidRuntimeIdCase) => {
      await expect(() => {
        scheduleOnRuntimeWithId(runtimeId as unknown as number, noop);
      }).toThrow(message);
    }
  );

  test.each(INVALID_RUNTIME_IDS)(
    'runOnRuntimeSyncWithId throws for %s',
    async ([_description, runtimeId, message]: InvalidRuntimeIdCase) => {
      await expect(() => {
        runOnRuntimeSyncWithId(runtimeId as unknown as number, noop);
      }).toThrow(message);
    }
  );

  test.each(INVALID_RUNTIME_IDS)(
    'runOnRuntimeAsyncWithId rejects for %s',
    async ([_description, runtimeId, message]: InvalidRuntimeIdCase) => {
      let errorMessage = '';
      try {
        await runOnRuntimeAsyncWithId(runtimeId as unknown as number, noop);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage.includes(message)).toBe(true);
    }
  );
});
