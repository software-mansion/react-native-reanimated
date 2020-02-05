/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#import "MBFingerTipWindow.h"
#import <React/RCTLinkingManager.h>

#import <React/RCTCxxBridgeDelegate.h>
#import <ReactCommon/BridgeJSCallInvoker.h>
#import <cxxreact/JSExecutor.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/JSCExecutorFactory.h>
#import "RETurboModuleProvider.h"


@interface AppDelegate() <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate>{
  RCTTurboModuleManager *_turboModuleManager;
}
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  RCTEnableTurboModule(YES); // turbo 2
  
  _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  
  NSURL *jsCodeLocation;

  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];

  [[RCTBundleURLProvider sharedSettings] setJsLocation:jsCodeLocation.host];

  NSDictionary *initProps = @{};
  
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:_bridge moduleName:@"ReanimatedExample" initialProperties:initProps];

  /*[[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"ReanimatedExample"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];*/
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  MBFingerTipWindow *window = [[MBFingerTipWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  window.alwaysShowTouches = YES;
  self.window = window;
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}


- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge
{
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"
                                                        fallbackResource:nil];
}


- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:app openURL:url options:options];
}

- (void)loadSourceForBridge:(RCTBridge *)bridge
                 onProgress:(RCTSourceLoadProgressBlock)onProgress
                 onComplete:(RCTSourceLoadBlock)loadCallback
{
  [RCTJavaScriptLoader loadBundleAtURL:[self sourceURLForBridge:bridge]
                            onProgress:onProgress
                            onComplete:loadCallback];
}

# pragma mark - RCTCxxBridgeDelegate

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  __weak __typeof(self) weakSelf = self;
  return std::make_unique<facebook::react::JSCExecutorFactory>([weakSelf, bridge](facebook::jsi::Runtime &runtime) {
    if (!bridge) {
      return;
    }
    __typeof(self) strongSelf = weakSelf;
    if (strongSelf) {
      strongSelf->_turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge delegate:strongSelf];
      [strongSelf->_turboModuleManager installJSBindingWithRuntime:&runtime];
    }
  });
}

#pragma mark RCTTurboModuleManagerDelegate

- (Class)getModuleClassFromName:(const char *)name
{
  return facebook::react::RETurboModuleClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::JSCallInvoker>)jsInvoker
{
  return facebook::react::RETurboModuleProvider(name, jsInvoker);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                       instance:(id<RCTTurboModule>)instance
                                                      jsInvoker:(std::shared_ptr<facebook::react::JSCallInvoker>)jsInvoker
{
  return facebook::react::RETurboModuleProvider(name, instance, jsInvoker);
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  // No custom initializer here.
  return [moduleClass new];
}


@end
