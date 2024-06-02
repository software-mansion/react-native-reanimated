/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <React/RCTUIKit.h> // [macOS]

NS_ASSUME_NONNULL_BEGIN

#ifdef __cplusplus
extern "C" {
#endif

// Get window and screen dimensions
typedef struct {
  struct {
    CGFloat width, height, scale, fontScale;
  } window, screen;
} RCTDimensions;
extern __attribute__((visibility("default")))
RCTDimensions RCTGetDimensions(CGFloat fontScale);

#if !TARGET_OS_OSX // [macOS]
// Get font size multiplier for font base size (Large) by content size category
extern __attribute__((visibility("default"))) CGFloat RCTGetMultiplierForContentSizeCategory(
    UIContentSizeCategory category) __deprecated;
#endif // [macOS]

#ifdef __cplusplus
}
#endif

NS_ASSUME_NONNULL_END
