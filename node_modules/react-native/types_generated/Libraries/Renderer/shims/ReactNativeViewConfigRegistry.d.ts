/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<3a79a0b8e110424dd7d417cd5eff6dff>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Renderer/shims/ReactNativeViewConfigRegistry.js
 */

import { type ViewConfig } from "./ReactNativeTypes";
export declare const customBubblingEventTypes: {
  [eventName: string]: Readonly<{
    phasedRegistrationNames: Readonly<{
      captured: string;
      bubbled: string;
      skipBubbling?: boolean | undefined;
    }>;
  }>;
};
export declare type customBubblingEventTypes = typeof customBubblingEventTypes;
export declare const customDirectEventTypes: {
  [eventName: string]: Readonly<{
    registrationName: string;
  }>;
};
export declare type customDirectEventTypes = typeof customDirectEventTypes;
/**
 * Registers a native view/component by name.
 * A callback is provided to load the view config from UIManager.
 * The callback is deferred until the view is actually rendered.
 */
export declare function register(name: string, callback: () => ViewConfig): string;
/**
 * Retrieves a config for the specified view.
 * If this is the first time the view has been used,
 * This configuration will be lazy-loaded from UIManager.
 */
export declare function get(name: string): ViewConfig;
