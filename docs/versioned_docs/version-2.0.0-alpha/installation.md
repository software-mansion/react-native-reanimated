---
id: installation
title: Installation
sidebar_label: Installation
---

Reanimated 2 is primarily built in C++ using [Turbo Modules](https://github.com/react-native-community/discussions-and-proposals/issues/40) infrastructure which is not yet completely deployed in React Native (specifically on Android).
Because of that the installation of new Reanimated requires additional steps apart from just adding a dependency to `package.json` .

As a consequence of the above the minimum supported version of React Native is [v0.62](https://github.com/facebook/react-native/releases/tag/v0.62.0).
Before you continue with the installation, make sure that you are running the supported version of React Native.

Please follow the below instructions for Android and iOS.

## I just want to try new Reanimated...

We realize the project setup is very complex and you may not want to add that to your existing app rightaway.
If you just want to play with Reanimated 2, we made a clean repo that has all the steps configured so that you can pull it from github and give the new version a shot.

[Visit the Playground repo here](https://github.com/software-mansion-labs/reanimated-2-playground) or copy the command below to do a git checkout:

```bash
> git checkout git@github.com:software-mansion-labs/reanimated-2-playground.git
```

Continue with the instruction below if you'd like to install Reanimated v2 on an existing or new React Native project.

## Installing the package

First step is to install `react-native-reanimated` alpha as a dependency in your project:

```bash
> yarn add react-native-reanimated@alpha
```

## Babel plugin

Add Reanimated's babel plugin to your `babel.config.js`:

```js {5}
  module.exports = {
      ...
      plugins: [
          ...
          'react-native-reanimated/plugin',
      ],
  };
```

> **_NOTE:_** Reanimated plugin has to be listed last.

## Android

1. Turn on Hermes engine by editing `android/app/build.gradle`

```java {2}
project.ext.react = [
  enableHermes: true  // <- here | clean and rebuild if changing
]
```

2. Turn on TurboModules by editing `MainApplication.java`

```java {1,5-7}
import com.facebook.react.config.ReactFeatureFlags; // <- add
...
public class MainApplication extends Application implements ReactApplication {
  ...
  static {
    ReactFeatureFlags.useTurboModules = true; // <- add
  }
  ...
```

3. Plug Reanimated

```java {1-2,12-15}
  import com.facebook.react.bridge.JSIModulePackage; // <- add
  import com.swmansion.reanimated.ReanimatedJSIModulePackage; // <- add
  ...
  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
  ...

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }

      @Override
      protected JSIModulePackage getJSIModulePackage() {
        return new ReanimatedJSIModulePackage(); // <- add
      }
    };
  ...
```

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/commit/938d494e9512d9fb82c30c23cc80f82c02abd9ea) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).

## iOS

Steps here are adapted directly from [React Native's RNTester app](https://github.com/facebook/react-native/blob/master/RNTester/RNTester/AppDelegate.mm), that is configured to use Turbo Modules.
Most of the changes aren't specific to Reanimated but rather to Turbo Modules itself.
If your iOS app is already using Turbo Modules, you can likely skip some of the steps below.
If not, after making those changes your app will be compatible with Turbo Modules which may help with future React Native upgrades.

1. `cd ios && pod install && cd ..`

2. Add bridge property to `AppDelegate.h`

```objectivec {2,6}
...
@class RCTBridge; // <-add

@interface AppDelegate : UIResponder <UIApplicationDelegate>
...
@property (nonatomic, readonly) RCTBridge *bridge; // <-add
...
@end
```

3. Rename `AppDelegate.m` to `AppDelagate.mm`.
4. Add AppDelegate category in `AppDelagate.mm`.

```objectivec {1-2,4-7}
#import <React/RCTCxxBridgeDelegate.h>
#import <ReactCommon/RCTTurboModuleManager.h>
...
@interface AppDelegate() <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate> {
    RCTTurboModuleManager *_turboModuleManager;
}
@end
```

5. Enable TurboModules in `AppDelagate.mm`.

```objectivec {3}
  + (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
  {
    RCTEnableTurboModule(YES); // <- add
```

6. Replace bridge initialization in `AppDelagate.mm`.

```objectivec {4-8}
  - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
  {
    RCTEnableTurboModule(YES);
    // RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
    // RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
    //                                                  moduleName:@"_YourAppNameHere_"
    //                                           initialProperties:nil];
    // NOTE: we now use _bridge with an underscore to create a rootView
    _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
    // NOTE: use your app name instead of _YourAppNameHere_
    RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:_bridge
                                                     moduleName:@"_YourAppNameHere_"
                                              initialProperties:nil];
    ...
```

7. Add remaining methods needed to configure Turbo Modules and Reanimated module in particular – all changes should be made in `AppDelagate.mm`.

```objectivec
// add headers
#import <React/RCTDataRequestHandler.h>
#import <React/RCTFileRequestHandler.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTNetworking.h>
#import <React/RCTLocalAssetImageLoader.h>
#import <React/RCTGIFImageDecoder.h>
#import <React/RCTImageLoader.h>
#import <React/JSCExecutorFactory.h>
#import <RNReanimated/RETurboModuleProvider.h>
...
@implementation AppDelegate // changes should be made within AppDelegate's implementation
...

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
 _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge delegate:self];
 __weak __typeof(self) weakSelf = self;
 return std::make_unique<facebook::react::JSCExecutorFactory>([weakSelf, bridge](facebook::jsi::Runtime &runtime) {
   if (!bridge) {
     return;
   }
   __typeof(self) strongSelf = weakSelf;
   if (strongSelf) {
     [strongSelf->_turboModuleManager installJSBindingWithRuntime:&runtime];
   }
 });
}

- (Class)getModuleClassFromName:(const char *)name
{
 return facebook::react::RETurboModuleClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
 return facebook::react::RETurboModuleProvider(name, jsInvoker);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      instance:(id<RCTTurboModule>)instance
                                                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
 return facebook::react::RETurboModuleProvider(name, instance, jsInvoker);
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
 if (moduleClass == RCTImageLoader.class) {
   return [[moduleClass alloc] initWithRedirectDelegate:nil loadersProvider:^NSArray<id<RCTImageURLLoader>> *{
     return @[[RCTLocalAssetImageLoader new]];
   } decodersProvider:^NSArray<id<RCTImageDataDecoder>> *{
     return @[[RCTGIFImageDecoder new]];
   }];
 } else if (moduleClass == RCTNetworking.class) {
   return [[moduleClass alloc] initWithHandlersProvider:^NSArray<id<RCTURLRequestHandler>> *{
     return @[
       [RCTHTTPRequestHandler new],
       [RCTDataRequestHandler new],
       [RCTFileRequestHandler new],
     ];
   }];
 }
 return [moduleClass new];
}

@end
```

8. Enable developer menu in `AppDelegate.mm`.

```objectivec
- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge delegate:self];

  #if RCT_DEV
    [_turboModuleManager moduleForName:"RCTDevMenu"]; // <- add
  #endif
  ...
```


You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/commit/f6f2b77496bc00601150f98ea19a341f844d06a3) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).
