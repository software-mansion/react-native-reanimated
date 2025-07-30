/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<093044a52f61595ebe3c6981bd7eef6e>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/deepFreezeAndThrowOnMutationInDev.js
 */

/**
 * If your application is accepting different values for the same field over
 * time and is doing a diff on them, you can either (1) create a copy or
 * (2) ensure that those values are not mutated behind two passes.
 * This function helps you with (2) by freezing the object and throwing if
 * the user subsequently modifies the value.
 *
 * There are two caveats with this function:
 *   - If the call site is not in strict mode, it will only throw when
 *     mutating existing fields, adding a new one
 *     will unfortunately fail silently :(
 *   - If the object is already frozen or sealed, it will not continue the
 *     deep traversal and will leave leaf nodes unfrozen.
 *
 * Freezing the object and adding the throw mechanism is expensive and will
 * only be used in DEV.
 */
declare function deepFreezeAndThrowOnMutationInDev<T extends {} | Array<unknown>>(object: T): T;
declare const $$deepFreezeAndThrowOnMutationInDev: typeof deepFreezeAndThrowOnMutationInDev;
declare type $$deepFreezeAndThrowOnMutationInDev = typeof $$deepFreezeAndThrowOnMutationInDev;
export default $$deepFreezeAndThrowOnMutationInDev;
