/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#import <React/RCTDefines.h>

/**
 * Bitmask defines how size constrains from `-[UIView sizeThatFits:]`
 * are translated to `-[RCTSurface sizeThatFitsMinimumSize:maximumSize:]`.
 */
typedef NS_OPTIONS(NSInteger, RCTSurfaceSizeMeasureMode) {
  RCTSurfaceSizeMeasureModeWidthUndefined = 0 << 0,
  RCTSurfaceSizeMeasureModeWidthExact = 1 << 0,
  RCTSurfaceSizeMeasureModeWidthAtMost = 2 << 0,
  RCTSurfaceSizeMeasureModeHeightUndefined = 0 << 2,
  RCTSurfaceSizeMeasureModeHeightExact = 1 << 2,
  RCTSurfaceSizeMeasureModeHeightAtMost = 2 << 2,
};

/**
 * Returns size constraints based on `size` and `sizeMeasureMode`.
 */
RCT_EXTERN void RCTSurfaceMinimumSizeAndMaximumSizeFromSizeAndSizeMeasureMode(
    CGSize size,
    RCTSurfaceSizeMeasureMode sizeMeasureMode,
    CGSize *minimumSize,
    CGSize *maximumSize);
