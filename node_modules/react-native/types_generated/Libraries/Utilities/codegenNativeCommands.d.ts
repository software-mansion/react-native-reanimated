/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<3d6ced01d763d9f901db49ce869caf10>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/codegenNativeCommands.js
 */

type Options<T = string> = Readonly<{
  supportedCommands: ReadonlyArray<T>;
}>;
declare function codegenNativeCommands<T extends {}>(options: Options<keyof T>): T;
declare const $$codegenNativeCommands: typeof codegenNativeCommands;
declare type $$codegenNativeCommands = typeof $$codegenNativeCommands;
export default $$codegenNativeCommands;
