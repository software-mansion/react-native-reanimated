import NativeCppCounter from './NativeCppCounter';

export function getCount(): number {
  return NativeCppCounter.getCount();
}
