/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import type {TurboModule} from '../TurboModule/RCTExport';

import * as TurboModuleRegistry from '../TurboModule/TurboModuleRegistry';

export type ReactNativeVersionAndroid = {|
  major: number,
  minor: number,
  patch: number,
  prerelease: ?number,
|};

export type PlatformConstantsAndroid = {|
  isTesting: boolean,
  isDisableAnimations?: boolean,
  reactNativeVersion: ReactNativeVersionAndroid,
  Version: number,
  Release: string,
  Serial: string,
  Fingerprint: string,
  Model: string,
  ServerHost?: string,
  uiMode: string,
  Brand: string,
  Manufacturer: string,
|};

export interface Spec extends TurboModule {
  +getConstants: () => PlatformConstantsAndroid;
  +getAndroidID: () => string;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'PlatformConstants',
): Spec);
