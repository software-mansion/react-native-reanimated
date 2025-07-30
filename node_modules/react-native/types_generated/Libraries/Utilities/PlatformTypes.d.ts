/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c9459dc454f7e7025adfaf154015d09d>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/PlatformTypes.js
 */

export type PlatformOSType = "ios" | "android" | "macos" | "windows" | "web" | "native";
type OptionalPlatformSelectSpec<T> = { [_key in PlatformOSType]?: T };
export type PlatformSelectSpec<T> = (Omit<OptionalPlatformSelectSpec<T>, keyof {
  default: T;
}> & {
  default: T;
}) | OptionalPlatformSelectSpec<T>;
type IOSPlatform = {
  OS: "ios";
  get Version(): string;
  get constants(): {
    forceTouchAvailable: boolean;
    interfaceIdiom: string;
    isTesting: boolean;
    isDisableAnimations?: boolean;
    osVersion: string;
    reactNativeVersion: {
      major: number;
      minor: number;
      patch: number;
      prerelease: string | undefined;
    };
    systemName: string;
    isMacCatalyst?: boolean;
  };
  get isPad(): boolean;
  get isTV(): boolean;
  get isVision(): boolean;
  get isTesting(): boolean;
  get isDisableAnimations(): boolean;
  get isMacCatalyst(): boolean;
  select: <T>(spec: PlatformSelectSpec<T>) => T;
};
type AndroidPlatform = {
  OS: "android";
  get Version(): number;
  get constants(): {
    isTesting: boolean;
    isDisableAnimations?: boolean;
    reactNativeVersion: {
      major: number;
      minor: number;
      patch: number;
      prerelease: string | undefined;
    };
    Version: number;
    Release: string;
    Serial: string;
    Fingerprint: string;
    Model: string;
    ServerHost?: string;
    uiMode: string;
    Brand: string;
    Manufacturer: string;
  };
  get isTV(): boolean;
  get isVision(): boolean;
  get isTesting(): boolean;
  get isDisableAnimations(): boolean;
  select: <T>(spec: PlatformSelectSpec<T>) => T;
};
type WindowsPlatform = {
  OS: "windows";
  get Version(): number;
  get constants(): {
    isTesting: boolean;
    isDisableAnimations?: boolean;
    reactNativeVersion: {
      major: number;
      minor: number;
      patch: number;
      prerelease: string | undefined;
    };
    reactNativeWindowsVersion: {
      major: number;
      minor: number;
      patch: number;
    };
    osVersion: number;
  };
  get isTesting(): boolean;
  get isDisableAnimations(): boolean;
  get isTV(): boolean;
  select: <T>(spec: PlatformSelectSpec<T>) => T;
};
type MacOSPlatform = {
  OS: "macos";
  get Version(): string;
  get constants(): {
    isTesting: boolean;
    osVersion: string;
    reactNativeVersion: {
      major: number;
      minor: number;
      patch: number;
      prerelease: number | undefined;
    };
    systemName: string;
  };
  get isTV(): boolean;
  get isVision(): boolean;
  get isTesting(): boolean;
  get isDisableAnimations(): boolean;
  select: <T>(spec: PlatformSelectSpec<T>) => T;
};
type WebPlatform = {
  OS: "web";
  get Version(): void;
  get constants(): {
    reactNativeVersion: {
      major: number;
      minor: number;
      patch: number;
      prerelease: string | undefined;
    };
  };
  get isTV(): boolean;
  get isTesting(): boolean;
  get isDisableAnimations(): boolean;
  select: <T>(spec: PlatformSelectSpec<T>) => T;
};
export type Platform = IOSPlatform | AndroidPlatform | WindowsPlatform | MacOSPlatform | WebPlatform;
