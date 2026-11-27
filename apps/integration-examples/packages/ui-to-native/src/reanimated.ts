import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { getCount } from './index';

export function useCounter(): SharedValue<number> {
  const count = useSharedValue(getCount);

  useFrameCallback(() => {
    'worklet';
    count.set(getCount());
  });

  return count;
}
