/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTConvert.h>
#import <React/RCTViewManager.h>

#if !TARGET_OS_OSX // [macOS]
@interface RCTConvert (UIScrollView)

#if TARGET_OS_IOS // [visionOS]
+ (UIScrollViewKeyboardDismissMode)UIScrollViewKeyboardDismissMode:(id)json;
#endif // [visionOS]

@end
#endif // [macOS]

@interface RCTScrollViewManager : RCTViewManager

@end
