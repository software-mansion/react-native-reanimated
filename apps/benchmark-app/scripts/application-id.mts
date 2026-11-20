import type { VariantKey } from './config.mts';

const APPLICATION_ID = 'com.reanimatedbenchmark';

export function applicationSuffix(key: VariantKey): string {
  return `.${key}`;
}

export function applicationIdOf(key: VariantKey): string {
  return `${APPLICATION_ID}${applicationSuffix(key)}`;
}
