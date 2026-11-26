import type { HybridObject } from 'react-native-nitro-modules';

export interface Counter extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  readonly count: number;
  addListener(listener: (count: number) => void): number;
  removeListener(id: number): void;
}
