/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTUIUtils.h"

#import "RCTUtils.h"

RCTDimensions RCTGetDimensions(CGFloat fontScale)
{
#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_VISION // [visionOS]
  UIScreen *mainScreen = UIScreen.mainScreen;
  CGSize screenSize = mainScreen.bounds.size;
#else
  CGSize screenSize = CGSizeZero;
#endif
#else // [macOS
  NSScreen *mainScreen = NSScreen.mainScreen;
  CGSize screenSize = mainScreen.frame.size;
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
  UIView *mainWindow = RCTKeyWindow();
  // We fallback to screen size if a key window is not found.
  CGSize windowSize = mainWindow ? mainWindow.bounds.size : screenSize;
#else // [macOS
  NSWindow *window = RCTKeyWindow();
  NSSize windowSize = window ? [window frame].size : CGSizeZero;
  screenSize = window ? [[window screen] frame].size : screenSize;
  CGFloat scale = window ? [[window screen] backingScaleFactor] : 1.0; // Default scale to 1.0 if window is nil
#endif // macOS]
  
  RCTDimensions result;
#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_VISION // [visionOS]
  typeof(result.screen) dimsScreen = {
      .width = screenSize.width, .height = screenSize.height, .scale = mainScreen.scale, .fontScale = fontScale};
  typeof(result.window) dimsWindow = {
      .width = windowSize.width, .height = windowSize.height, .scale = mainScreen.scale, .fontScale = fontScale};
#else // [visionOS hardcode the scale to a dummy value of 2
  typeof(result.screen) dimsScreen = {
	  .width = screenSize.width, .height = screenSize.height, .scale = 2, .fontScale = fontScale};
  typeof(result.window) dimsWindow = {
	  .width = windowSize.width, .height = windowSize.height, .scale = 2, .fontScale = fontScale};
#endif // visionOS]
#else // [macOS
  typeof(result.screen) dimsScreen = {
      .width = screenSize.width, 
      .height = screenSize.height, 
      .scale = scale,
      .fontScale = fontScale};
  typeof(result.window) dimsWindow = {
      .width = windowSize.width, 
      .height = windowSize.height, 
      .scale = scale,
      .fontScale = fontScale};
#endif // macOS]
  result.screen = dimsScreen;
  result.window = dimsWindow;

  return result;
}

#if !TARGET_OS_OSX // [macOS]
CGFloat RCTGetMultiplierForContentSizeCategory(UIContentSizeCategory category)
{
  static NSDictionary<NSString *, NSNumber *> *multipliers = nil;
  static dispatch_once_t token;
  dispatch_once(&token, ^{
    multipliers = @{
      UIContentSizeCategoryExtraSmall : @0.823,
      UIContentSizeCategorySmall : @0.882,
      UIContentSizeCategoryMedium : @0.941,
      UIContentSizeCategoryLarge : @1.0,
      UIContentSizeCategoryExtraLarge : @1.118,
      UIContentSizeCategoryExtraExtraLarge : @1.235,
      UIContentSizeCategoryExtraExtraExtraLarge : @1.353,
      UIContentSizeCategoryAccessibilityMedium : @1.786,
      UIContentSizeCategoryAccessibilityLarge : @2.143,
      UIContentSizeCategoryAccessibilityExtraLarge : @2.643,
      UIContentSizeCategoryAccessibilityExtraExtraLarge : @3.143,
      UIContentSizeCategoryAccessibilityExtraExtraExtraLarge : @3.571
    };
  });

  double value = multipliers[category].doubleValue;
  return value > 0.0 ? value : 1.0;
}
#endif // [macOS]
