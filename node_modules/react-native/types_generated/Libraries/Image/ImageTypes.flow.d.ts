/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<60d9ff37ba194eb14e33c2675f2f13b4>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Image/ImageTypes.flow.js
 */

import type { RootTag } from "../Types/RootTagTypes";
import type { ResolvedAssetSource } from "./AssetSourceResolver";
import type { ImageProps as ImagePropsType } from "./ImageProps";
import type { ImageSource } from "./ImageSource";
import type $$IMPORT_TYPEOF_1$$ from "./ImageViewNativeComponent";
type ImageViewNativeComponent = typeof $$IMPORT_TYPEOF_1$$;
import type $$IMPORT_TYPEOF_2$$ from "./TextInlineImageNativeComponent";
type TextInlineImageNativeComponent = typeof $$IMPORT_TYPEOF_2$$;
import * as React from "react";
export type ImageSize = {
  width: number;
  height: number;
};
export type ImageResolvedAssetSource = ResolvedAssetSource;
type ImageComponentStaticsIOS = Readonly<{
  getSize(uri: string): Promise<ImageSize>;
  getSize(uri: string, success: (width: number, height: number) => void, failure?: (error: unknown) => void): void;
  getSizeWithHeaders(uri: string, headers: {
    [$$Key$$: string]: string;
  }): Promise<ImageSize>;
  getSizeWithHeaders(uri: string, headers: {
    [$$Key$$: string]: string;
  }, success: (width: number, height: number) => void, failure?: (error: unknown) => void): void;
  prefetch(url: string): Promise<boolean>;
  prefetchWithMetadata(url: string, queryRootName: string, rootTag?: RootTag | undefined): Promise<boolean>;
  queryCache(urls: Array<string>): Promise<{
    [url: string]: "memory" | "disk" | "disk/memory";
  }>;
  /**
   * @see https://reactnative.dev/docs/image#resolveassetsource
   */
  resolveAssetSource(source: ImageSource): ImageResolvedAssetSource | undefined;
}>;
type ImageComponentStaticsAndroid = Readonly<Omit<ImageComponentStaticsIOS, keyof {
  abortPrefetch(requestId: number): void;
}> & {
  abortPrefetch(requestId: number): void;
}>;
export type AbstractImageAndroid = (props: Omit<ImagePropsType, keyof {
  ref?: React.Ref<React.ComponentRef<TextInlineImageNativeComponent> | React.ComponentRef<ImageViewNativeComponent>>;
}> & {
  ref?: React.Ref<React.ComponentRef<TextInlineImageNativeComponent> | React.ComponentRef<ImageViewNativeComponent>>;
}) => React.ReactNode;
export type ImageAndroid = AbstractImageAndroid & ImageComponentStaticsAndroid;
export type AbstractImageIOS = (props: Omit<ImagePropsType, keyof {
  ref?: React.Ref<React.ComponentRef<ImageViewNativeComponent>>;
}> & {
  ref?: React.Ref<React.ComponentRef<ImageViewNativeComponent>>;
}) => React.ReactNode;
export type ImageIOS = AbstractImageIOS & ImageComponentStaticsIOS;
export type ImageType = ImageIOS | ImageAndroid;
export type { ImageProps } from "./ImageProps";
