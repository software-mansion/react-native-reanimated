/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<1601cdd5e45721496db2062fa4588524>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Blob/BlobTypes.js
 */

export declare type BlobCollector = symbol & {
  __BlobCollector__: string;
};
export type BlobData = {
  blobId: string;
  offset: number;
  size: number;
  name?: string;
  type?: string;
  lastModified?: number;
};
export type BlobOptions = {
  type: string;
  lastModified: number;
};
