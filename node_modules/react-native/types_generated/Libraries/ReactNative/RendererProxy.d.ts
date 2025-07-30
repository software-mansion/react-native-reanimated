/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<87be6ff78b921ac3866465d0e608d634>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/RendererProxy.js
 */

/**
 * This module exists to allow apps to select their renderer implementation
 * (e.g.: Fabric-only, Paper-only) without having to pull all the renderer
 * implementations into their app bundle, which affects app size.
 *
 * By default, the setup will be:
 *   -> RendererProxy
 *     -> RendererImplementation (which uses Fabric or Paper depending on a flag at runtime)
 *
 * But this will allow a setup like this without duplicating logic:
 *   -> RendererProxy (fork)
 *     -> RendererImplementation (which uses Fabric or Paper depending on a flag at runtime)
 *     or -> OtherImplementation (which uses Fabric only)
 */

export * from "./RendererImplementation";
