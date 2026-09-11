import type React from 'react';

export const REAPlatform = {
  ANDROID: 'android',
  IOS: 'ios',
  MACOS: 'macos',
  WEB: 'web',
};

export interface Example {
  icon?: string;
  title: string;
  screen: React.FC;
  shouldWork?: {
    ios: boolean;
    android: boolean;
  };
  disabledPlatforms?: Array<(typeof REAPlatform)[keyof typeof REAPlatform]>;
  needsBundleMode?: boolean;
}

export interface ExampleGroup {
  icon?: string;
  title: string;
  examples: Record<string, Example>;
}

export type ExampleEntry = Example | ExampleGroup;

export function isExampleGroup(entry: ExampleEntry): entry is ExampleGroup {
  return 'examples' in entry;
}
