/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a5217da14d3f942ee7db859f8b617773>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Image/AssetSourceResolver.js
 */

export type ResolvedAssetSource = {
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly uri: string;
  readonly scale: number;
};
type AssetDestPathResolver = "android" | "generic";
type PackagerAsset = Readonly<{
  fileSystemLocation: string;
  httpServerLocation: string;
  width: number | undefined;
  height: number | undefined;
  scales: Array<number>;
  hash: string;
  name: string;
  type: string;
  resolver?: AssetDestPathResolver;
}>;
declare class AssetSourceResolver {
  serverUrl: null | undefined | string;
  jsbundleUrl: null | undefined | string;
  asset: PackagerAsset;
  constructor(serverUrl: null | undefined | string, jsbundleUrl: null | undefined | string, asset: PackagerAsset);
  isLoadedFromServer(): boolean;
  isLoadedFromFileSystem(): boolean;
  defaultAsset(): ResolvedAssetSource;
  getAssetUsingResolver(resolver: AssetDestPathResolver): ResolvedAssetSource;
  assetServerURL(): ResolvedAssetSource;
  scaledAssetPath(): ResolvedAssetSource;
  scaledAssetURLNearBundle(): ResolvedAssetSource;
  resourceIdentifierWithoutScale(): ResolvedAssetSource;
  drawableFolderInBundle(): ResolvedAssetSource;
  fromSource(source: string): ResolvedAssetSource;
  static pickScale: (scales: Array<number>, deviceScale?: number) => number;
}
export default AssetSourceResolver;
