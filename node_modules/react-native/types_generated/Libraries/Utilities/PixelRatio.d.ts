/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a757a812009287d96789ce094a11f6b2>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/PixelRatio.js
 */

/**
 * PixelRatio class gives access to the device pixel density.
 *
 * ## Fetching a correctly sized image
 *
 * You should get a higher resolution image if you are on a high pixel density
 * device. A good rule of thumb is to multiply the size of the image you display
 * by the pixel ratio.
 *
 * ```
 * var image = getImage({
 *   width: PixelRatio.getPixelSizeForLayoutSize(200),
 *   height: PixelRatio.getPixelSizeForLayoutSize(100),
 * });
 * <Image source={image} style={{width: 200, height: 100}} />
 * ```
 *
 * ## Pixel grid snapping
 *
 * In iOS, you can specify positions and dimensions for elements with arbitrary
 * precision, for example 29.674825. But, ultimately the physical display only
 * have a fixed number of pixels, for example 640×960 for iPhone 4 or 750×1334
 * for iPhone 6. iOS tries to be as faithful as possible to the user value by
 * spreading one original pixel into multiple ones to trick the eye. The
 * downside of this technique is that it makes the resulting element look
 * blurry.
 *
 * In practice, we found out that developers do not want this feature and they
 * have to work around it by doing manual rounding in order to avoid having
 * blurry elements. In React Native, we are rounding all the pixels
 * automatically.
 *
 * We have to be careful when to do this rounding. You never want to work with
 * rounded and unrounded values at the same time as you're going to accumulate
 * rounding errors. Having even one rounding error is deadly because a one
 * pixel border may vanish or be twice as big.
 *
 * In React Native, everything in JavaScript and within the layout engine works
 * with arbitrary precision numbers. It's only when we set the position and
 * dimensions of the native element on the main thread that we round. Also,
 * rounding is done relative to the root rather than the parent, again to avoid
 * accumulating rounding errors.
 *
 */
declare class PixelRatio {
  static get(): number;
  static getFontScale(): number;
  static getPixelSizeForLayoutSize(layoutSize: number): number;
  static roundToNearestPixel(layoutSize: number): number;
  static startDetecting(): void;
}
export default PixelRatio;
