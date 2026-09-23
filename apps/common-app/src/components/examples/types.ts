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

  /** Title of the section this example is listed under in its group. */
  section?: string;
}

export interface ExampleGroup {
  icon?: string;
  title: string;
  examples: Record<string, Example>;
  hiddenPlatforms?: Array<(typeof REAPlatform)[keyof typeof REAPlatform]>;

  /** Section titles in display order; without them the group is a flat list. */
  sections?: ReadonlyArray<string>;
}

export type ExampleEntry = Example | ExampleGroup;

export function isExampleGroup(entry: ExampleEntry): entry is ExampleGroup {
  return 'examples' in entry;
}
