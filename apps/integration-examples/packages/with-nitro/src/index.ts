import { NitroModules } from 'react-native-nitro-modules';

import type { Counter } from './specs/Counter.nitro';

export const counter = NitroModules.createHybridObject<Counter>('Counter');

export function getCount(): number {
  return counter.count;
}
