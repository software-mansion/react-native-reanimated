/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<d980f25c3bff53b9915350a6f645c62f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Image/ImageBackground.js
 */

import type { ImageBackgroundProps } from "./ImageProps";
import * as React from "react";
export type { ImageBackgroundProps } from "./ImageProps";
/**
 * Very simple drop-in replacement for <Image> which supports nesting views.
 *
 * ```ReactNativeWebPlayer
 * import React, { Component } from 'react';
 * import { AppRegistry, View, ImageBackground, Text } from 'react-native';
 *
 * class DisplayAnImageBackground extends Component {
 *   render() {
 *     return (
 *       <ImageBackground
 *         style={{width: 50, height: 50}}
 *         source={{uri: 'https://reactnative.dev/img/opengraph.png'}}
 *       >
 *         <Text>React</Text>
 *       </ImageBackground>
 *     );
 *   }
 * }
 *
 * // App registration and rendering
 * AppRegistry.registerComponent('DisplayAnImageBackground', () => DisplayAnImageBackground);
 * ```
 */
declare class ImageBackground extends React.Component<ImageBackgroundProps> {
  setNativeProps(props: {}): void;
  render(): React.ReactNode;
}
export default ImageBackground;
