import { Platform } from 'react-native';

import NativeRuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

(Platform.OS === 'ios' ? describe : describe.skip)(
  'Queued layout animation removal',
  () => {
    test('queues layout animations for views that remain mounted', async () => {
      const result =
        await NativeRuntimeTestObserver!.replayLayoutUpdateRemoval(false);
      expect(result.childMapped).toBe(true);
      expect(result.childAnimationPending).toBe(true);
      expect(result.survivorAnimationPending).toBe(true);
      expect(result.flushRequests).toBe(1);
    });

    test('discards a queued layout animation when a later mutation removes its parent', async () => {
      const result =
        await NativeRuntimeTestObserver!.replayLayoutUpdateRemoval(true);
      expect(result.childMapped).toBe(false);
      expect(result.childAnimationPending).toBe(false);
      expect(result.survivorAnimationPending).toBe(true);
      expect(result.flushRequests).toBe(1);
    });
  }
);
