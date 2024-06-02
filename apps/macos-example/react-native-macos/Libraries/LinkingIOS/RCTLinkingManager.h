/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTEventEmitter.h>
#import <React/RCTUIKit.h>
#if !TARGET_OS_OSX // [macOS]
#import <UIKit/UIUserActivity.h>
#endif // [macOS]

@interface RCTLinkingManager : RCTEventEmitter

#if !TARGET_OS_OSX // [macOS]
+ (BOOL)application:(nonnull UIApplication *)app
            openURL:(nonnull NSURL *)URL
            options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options;

+ (BOOL)application:(nonnull UIApplication *)application
              openURL:(nonnull NSURL *)URL
    sourceApplication:(nullable NSString *)sourceApplication
           annotation:(nonnull id)annotation;

+ (BOOL)application:(nonnull UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler;
#else // [macOS
+ (void)getUrlEventHandler:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)replyEvent;
+ (void)setAlwaysForegroundLastWindow:(BOOL)alwaysForeground;
#endif // macOS]

@end
