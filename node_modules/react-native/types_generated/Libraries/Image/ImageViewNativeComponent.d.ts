/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<3f8686bdc378078801b233b299cf2050>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Image/ImageViewNativeComponent.js
 */

import type { HostComponent } from "../../src/private/types/HostComponent";
import type { HostInstance } from "../../src/private/types/HostInstance";
import type { ViewProps } from "../Components/View/ViewPropTypes";
import type { PartialViewConfig } from "../Renderer/shims/ReactNativeTypes";
import type { ColorValue, DangerouslyImpreciseStyle, ImageStyleProp } from "../StyleSheet/StyleSheet";
import type { ResolvedAssetSource } from "./AssetSourceResolver";
import type { ImageProps } from "./ImageProps";
import type { ImageSource } from "./ImageSource";
type Props = Readonly<Omit<ImageProps, keyof ViewProps | keyof {
  style?: ImageStyleProp | DangerouslyImpreciseStyle;
  tintColor?: ColorValue;
  shouldNotifyLoadEvents?: boolean;
  src?: (ResolvedAssetSource | undefined) | (ReadonlyArray<Readonly<{
    uri?: string | undefined;
  }> | undefined> | undefined);
  headers?: {
    [$$Key$$: string]: string;
  } | undefined;
  defaultSource?: (ImageSource | undefined) | (string | undefined);
  loadingIndicatorSrc?: string | undefined;
}> & Omit<ViewProps, keyof {
  style?: ImageStyleProp | DangerouslyImpreciseStyle;
  tintColor?: ColorValue;
  shouldNotifyLoadEvents?: boolean;
  src?: (ResolvedAssetSource | undefined) | (ReadonlyArray<Readonly<{
    uri?: string | undefined;
  }> | undefined> | undefined);
  headers?: {
    [$$Key$$: string]: string;
  } | undefined;
  defaultSource?: (ImageSource | undefined) | (string | undefined);
  loadingIndicatorSrc?: string | undefined;
}> & {
  style?: ImageStyleProp | DangerouslyImpreciseStyle;
  tintColor?: ColorValue;
  shouldNotifyLoadEvents?: boolean;
  src?: (ResolvedAssetSource | undefined) | (ReadonlyArray<Readonly<{
    uri?: string | undefined;
  }> | undefined> | undefined);
  headers?: {
    [$$Key$$: string]: string;
  } | undefined;
  defaultSource?: (ImageSource | undefined) | (string | undefined);
  loadingIndicatorSrc?: string | undefined;
}>;
interface NativeCommands {
  readonly setIsVisible_EXPERIMENTAL: (viewRef: HostInstance, isVisible: boolean, time: number) => void;
}
export declare const Commands: NativeCommands;
export declare type Commands = typeof Commands;
export declare const __INTERNAL_VIEW_CONFIG: PartialViewConfig;
export declare type __INTERNAL_VIEW_CONFIG = typeof __INTERNAL_VIEW_CONFIG;
declare const ImageViewNativeComponent: HostComponent<Props>;
declare const $$ImageViewNativeComponent: typeof ImageViewNativeComponent;
declare type $$ImageViewNativeComponent = typeof $$ImageViewNativeComponent;
export default $$ImageViewNativeComponent;
