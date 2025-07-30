/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<db40600e608ac97674f7b9fa647fd197>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/registerCallableModule.js
 */

type Module = {};
type RegisterCallableModule = (name: string, moduleOrFactory: Module | (($$PARAM_0$$: void) => Module)) => void;
declare const registerCallableModule: RegisterCallableModule;
declare const $$registerCallableModule: typeof registerCallableModule;
declare type $$registerCallableModule = typeof $$registerCallableModule;
export default $$registerCallableModule;
