#pragma once

#if TARGET_OS_OSX
#else

#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReanimatedView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END

#endif
