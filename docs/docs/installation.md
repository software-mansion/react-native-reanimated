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

### Reanimated 2 in Expo

To use experimental support of Reanimated 2 in the Expo managed apps follow [their installation instructions](https://docs.expo.io/versions/latest/sdk/reanimated/).

### Using master branch builds
To use Reanimated 2 built from the master branch:

- go to the ["Build npm package" workflow in Reanimated repository](https://github.com/software-mansion/react-native-reanimated/actions?query=workflow%3A%22Build+npm+package%22)
- select latest build and download `react-native-reanimated-2.0.0-alpha.tgz` artifact
- run `tar zxvf react-native-reanimated-2.0.0-alpha.tgz.zip` to unpack zip (or unpack it manually)
- run `yarn add file:react-native-reanimated-2.0.0-*.tgz` to install the package
- run `cd android && ./gradlew clean`

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

2. Plug Reanimated in `MainApplication.java`

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

> **_NOTE:_** In previous releases, we required an additional step which is turning on Turbo Modules.
> If you are upgrading from alpha.{ <=3 } please remove the following lines:
>
> ```Java
> static {
>    ReactFeatureFlags.useTurboModules = true;
>  }
> ```
>
> from `MainActivity.java`.

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/pull/8/commits/71642dbe7bd96eb41df5b9f59d661ab15f6fc3f8) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).

## iOS

Steps here are adapted directly from [React Native's RNTester app](https://github.com/facebook/react-native/blob/master/RNTester/RNTester/AppDelegate.mm), that is configured to use Turbo Modules.
Most of the changes aren't specific to Reanimated but rather to Turbo Modules itself.
If your iOS app is already using Turbo Modules, you can likely skip some of the steps below.
If not, after making those changes your app will be compatible with Turbo Modules which may help with future React Native upgrades.

1. `cd ios && pod install && cd ..`

2. Rename `AppDelegate.m` to `AppDelegate.mm`.
   > **_NOTE:_** It's important to do it with Xcode.
3. Add AppDelegate category in `AppDelegate.mm`.

```objectivec {1-2,4-7}
#import <React/RCTCxxBridgeDelegate.h>
#import <ReactCommon/RCTTurboModuleManager.h>
...
@interface AppDelegate() <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate> {
    RCTTurboModuleManager *_turboModuleManager;
}
@end
```

4. Enable TurboModules in `AppDelegate.mm`.

```objectivec {3}
  + (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
  {
    RCTEnableTurboModule(YES); // <- add
```

5. Add remaining methods needed to configure Turbo Modules and Reanimated module in particular – all changes should be made in `AppDelegate.mm`.

```objectivec
// add headers (start)
#import <React/RCTDataRequestHandler.h>
#import <React/RCTFileRequestHandler.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTNetworking.h>
#import <React/RCTLocalAssetImageLoader.h>
#import <React/RCTGIFImageDecoder.h>
#import <React/RCTImageLoader.h>
#import <React/JSCExecutorFactory.h>
#import <RNReanimated/REATurboModuleProvider.h>
#import <RNReanimated/REAModule.h>
// add headers (end)
...
@implementation AppDelegate // changes should be made within AppDelegate's implementation
...

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _bridge_reanimated = bridge;
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                              delegate:self
                                                             jsInvoker:bridge.jsCallInvoker];
 #if RCT_DEV
  [_turboModuleManager moduleForName:"RCTDevMenu"]; // <- add
 #endif
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
 return facebook::react::REATurboModuleClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
 return facebook::react::REATurboModuleProvider(name, jsInvoker);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      instance:(id<RCTTurboModule>)instance
                                                     jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
 return facebook::react::REATurboModuleProvider(name, instance, jsInvoker);
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

6. ( Additinal step for React Native 0.62.\* ) Change initialization of TurboModuleManager

```objectivec {3-3}
- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge delegate:self];
  ...
```

You can refer [to this diff](https://github.com/software-mansion-labs/reanimated-2-playground/pull/8/commits/37cb058115562bdcd33e3d729abef1f27c081da5) that presents the set of the above changes made to a fresh react native project in our [Playground repo](https://github.com/software-mansion-labs/reanimated-2-playground).
