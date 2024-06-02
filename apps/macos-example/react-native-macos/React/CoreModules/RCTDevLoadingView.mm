/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDevLoadingView.h>

#import <QuartzCore/QuartzCore.h>

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTAppearance.h>
#import <React/RCTBridge.h>
#import <React/RCTConstants.h>
#import <React/RCTConvert.h>
#import <React/RCTDefines.h>
#import <React/RCTDevSettings.h> // [macOS]
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>
#import <React/RCTUIKit.h> // [macOS]

#import "CoreModulesPlugins.h"

using namespace facebook::react;

@interface RCTDevLoadingView () <NativeDevLoadingViewSpec>
@end

#if RCT_DEV_MENU

@implementation RCTDevLoadingView {
#if !TARGET_OS_OSX // [macOS]
  UIWindow *_window;
  UILabel *_label;
#else // [macOS
  NSWindow *_window;
  NSTextField *_label;
#endif // macOS]
  NSDate *_showDate;
  BOOL _hiding;
  dispatch_block_t _initialMessageBlock;
}

RCT_EXPORT_MODULE()

- (instancetype)init
{
  if (self = [super init]) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hide)
                                                 name:RCTJavaScriptDidLoadNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hide)
                                                 name:RCTJavaScriptDidFailToLoadNotification
                                               object:nil];
  }
  return self;
}

+ (void)setEnabled:(BOOL)enabled
{
  RCTDevLoadingViewSetEnabled(enabled);
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)clearInitialMessageDelay
{
  if (_initialMessageBlock != nil) {
    dispatch_block_cancel(_initialMessageBlock);
    _initialMessageBlock = nil;
  }
}

- (void)showInitialMessageDelayed:(void (^)())initialMessage
{
  _initialMessageBlock = dispatch_block_create(static_cast<dispatch_block_flags_t>(0), initialMessage);

  // We delay the initial loading message to prevent flashing it
  // when loading progress starts quickly. To do that, we
  // schedule the message to be shown in a block, and cancel
  // the block later when the progress starts coming in.
  // If the progress beats this timer, this message is not shown.
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, 0.2 * NSEC_PER_SEC), dispatch_get_main_queue(), self->_initialMessageBlock);
}

- (void)hideBannerAfter:(CGFloat)delay
{
  // Cancel previous hide call after the delay.
  [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(hide) object:nil];
  // Set new hide call after a delay.
  [self performSelector:@selector(hide) withObject:nil afterDelay:delay];
}

- (void)showMessage:(NSString *)message color:(RCTUIColor *)color backgroundColor:(RCTUIColor *)backgroundColor // [macOS]
{
  if (!RCTDevLoadingViewGetEnabled() || _hiding) {
    return;
  }

  // Input validation
  if (message == nil || [message isEqualToString:@""]) {
    NSLog(@"Error: message cannot be nil or empty");
    return;
  }
  if (color == nil) {
    NSLog(@"Error: color cannot be nil");
    return;
  }
  if (backgroundColor == nil) {
    NSLog(@"Error: backgroundColor cannot be nil");
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    self->_showDate = [NSDate date];

    if (!self->_window && !RCTRunningInTestEnvironment()) {
#if !TARGET_OS_OSX // [macOS]
      UIWindow *window = RCTKeyWindow();
      CGFloat windowWidth = window.bounds.size.width;

      self->_window = [[UIWindow alloc] initWithWindowScene:window.windowScene];
      self->_window.frame = CGRectMake(0, 0, windowWidth, window.safeAreaInsets.top + 10);
      self->_label = [[UILabel alloc] initWithFrame:CGRectMake(0, window.safeAreaInsets.top - 10, windowWidth, 20)];
      [self->_window addSubview:self->_label];

      self->_window.windowLevel = UIWindowLevelStatusBar + 1;
      // set a root VC so rotation is supported
      self->_window.rootViewController = [UIViewController new];

      self->_label.font = [UIFont monospacedDigitSystemFontOfSize:12.0 weight:UIFontWeightRegular];
      self->_label.textAlignment = NSTextAlignmentCenter;
#else // [macOS
      NSRect screenFrame = [NSScreen mainScreen].visibleFrame;
      self->_window = [[NSPanel alloc] initWithContentRect:NSMakeRect(screenFrame.origin.x + round((screenFrame.size.width - 375) / 2), screenFrame.size.height - 20, 375, 19)
                                                 styleMask:NSWindowStyleMaskBorderless
                                                   backing:NSBackingStoreBuffered
                                                     defer:YES];
      self->_window.releasedWhenClosed = NO;
      self->_window.backgroundColor = [NSColor clearColor];

      NSTextField *label = [[NSTextField alloc] initWithFrame:self->_window.contentView.bounds];
      label.alignment = NSTextAlignmentCenter;
      label.bezeled = NO;
      label.editable = NO;
      label.selectable = NO;
      label.wantsLayer = YES;
      label.layer.cornerRadius = label.frame.size.height / 3;
      self->_label = label;
      [[self->_window contentView] addSubview:label];
#endif // macOS]
    }

#if !TARGET_OS_OSX // [macOS]
    self->_label.text = message;
    self->_label.textColor = color;

    self->_window.backgroundColor = backgroundColor;
    self->_window.hidden = NO;
#else // [macOS
    self->_label.stringValue = message;
    self->_label.textColor = color;

    self->_label.backgroundColor = backgroundColor;
    [self->_window orderFront:nil];
#endif // macOS]
  });

  [self hideBannerAfter:15.0];
}

RCT_EXPORT_METHOD(showMessage
                  : (NSString *)message withColor
                  : (NSNumber *__nonnull)color withBackgroundColor
                  : (NSNumber *__nonnull)backgroundColor)
{
  [self showMessage:message color:[RCTConvert UIColor:color] backgroundColor:[RCTConvert UIColor:backgroundColor]];
}

RCT_EXPORT_METHOD(hide)
{
  if (!RCTDevLoadingViewGetEnabled()) {
    return;
  }

  // Cancel the initial message block so it doesn't display later and get stuck.
  [self clearInitialMessageDelay];

  dispatch_async(dispatch_get_main_queue(), ^{
    self->_hiding = YES;
    const NSTimeInterval MIN_PRESENTED_TIME = 0.6;
    NSTimeInterval presentedTime = [[NSDate date] timeIntervalSinceDate:self->_showDate];
    NSTimeInterval delay = MAX(0, MIN_PRESENTED_TIME - presentedTime);
#if !TARGET_OS_OSX // [macOS]
    CGRect windowFrame = self->_window.frame;
    [UIView animateWithDuration:0.25
        delay:delay
        options:0
        animations:^{
          self->_window.frame = CGRectOffset(windowFrame, 0, -windowFrame.size.height);
        }
        completion:^(__unused BOOL finished) {
          self->_window.frame = windowFrame;
          self->_window.hidden = YES;
          self->_window = nil;
          self->_hiding = false;
        }];
#else // [macOS]
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      [NSAnimationContext runAnimationGroup:^(__unused NSAnimationContext *context) {
        self->_window.animator.alphaValue = 0.0;
      } completionHandler:^{
        [self->_window close];
        self->_window = nil;
      }];
    });
#endif // macOS]
  });
}

- (void)showProgressMessage:(NSString *)message
{
  if (_window != nil) {
    // This is an optimization. Since the progress can come in quickly,
    // we want to do the minimum amount of work to update the UI,
    // which is to only update the label text.
#if !TARGET_OS_OSX // [macOS]
    _label.text = message;
#else // [macOS
    self->_label.stringValue = message;
#endif // macOS]
    return;
  }

  RCTUIColor *color = [RCTUIColor whiteColor]; // [macOS]
  RCTUIColor *backgroundColor = [RCTUIColor colorWithHue:105 saturation:0 brightness:.25 alpha:1]; // [macOS]

  if ([self isDarkModeEnabled]) {
    color = [RCTUIColor colorWithHue:208 saturation:0.03 brightness:.14 alpha:1]; // [macOS]
    backgroundColor = [RCTUIColor colorWithHue:0 saturation:0 brightness:0.98 alpha:1]; // [macOS]
  }

  [self showMessage:message color:color backgroundColor:backgroundColor];
}

- (void)showOfflineMessage
{
  // [macOS isDarkModeEnabled should only be run on the main thread
  __weak __typeof(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    RCTUIColor *color = [RCTUIColor whiteColor]; // [macOS]
    RCTUIColor *backgroundColor = [RCTUIColor blackColor]; // [macOS]

    if ([weakSelf isDarkModeEnabled]) {
      color = [RCTUIColor blackColor]; // [macOS]
      backgroundColor = [RCTUIColor whiteColor]; // [macOS]
    }

    NSString *message = [NSString stringWithFormat:@"Connect to %@ to develop JavaScript.", RCT_PACKAGER_NAME];
    [weakSelf showMessage:message color:color backgroundColor:backgroundColor];
  });
  // macOS]
}

- (BOOL)isDarkModeEnabled
{
  // We pass nil here to match the behavior of the native module.
  // If we were to pass a view, then it's possible that this native
  // banner would have a different color than the JavaScript banner
  // (which always passes nil). This would result in an inconsistent UI.
  return [RCTColorSchemePreference(nil) isEqualToString:@"dark"];
}
- (void)showWithURL:(NSURL *)URL
{
  if (URL.fileURL) {
    // If dev mode is not enabled, we don't want to show this kind of notification.
#if !RCT_DEV
    return;
#endif
    [self showOfflineMessage];
  } else {
    [self showInitialMessageDelayed:^{
      NSString *message = [NSString stringWithFormat:@"Loading from %@\u2026", RCT_PACKAGER_NAME];
      [self showProgressMessage:message];
    }];
  }
}

- (void)updateProgress:(RCTLoadingProgress *)progress
{
  if (!progress) {
    return;
  }

  // Cancel the initial message block so it's not flashed before progress.
  [self clearInitialMessageDelay];

  dispatch_async(dispatch_get_main_queue(), ^{
    [self showProgressMessage:[progress description]];
  });
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeDevLoadingViewSpecJSI>(params);
}

@end

#else

@implementation RCTDevLoadingView

+ (NSString *)moduleName
{
  return nil;
}
+ (void)setEnabled:(BOOL)enabled
{
}
- (void)showMessage:(NSString *)message color:(RCTUIColor *)color backgroundColor:(RCTUIColor *)backgroundColor // [macOS] RCTUIColor
{
}
- (void)showMessage:(NSString *)message withColor:(NSNumber *)color withBackgroundColor:(NSNumber *)backgroundColor
{
}
- (void)showWithURL:(NSURL *)URL
{
}
- (void)updateProgress:(RCTLoadingProgress *)progress
{
}
- (void)hide
{
}
- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeDevLoadingViewSpecJSI>(params);
}

@end

#endif

Class RCTDevLoadingViewCls(void)
{
  return RCTDevLoadingView.class;
}
