#import "UIResponder+Reanimated.h"
#import <React/RCTCxxBridgeDelegate.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/REAModule.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <RNReanimated/REAEventDispatcher.h>

#if __has_include(<React/RCTJSIExecutorRuntimeInstaller.h>)
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#else
#define RCTJSIExecutorRuntimeInstaller(x) x
#endif

#if __has_include(<ReactCommon/CallInvoker.h>)
#import <ReactCommon/CallInvoker.h>
#define NEW_CALL_INVOKER
#elif __has_include(<ReactCommon/BridgeJSCallInvoker.h>)
#import <ReactCommon/BridgeJSCallInvoker.h>
#else
#error JS-CallInvoker import could not be found!
#endif

#if __has_include(<React/HermesExecutorFactory.h>)
#import <React/HermesExecutorFactory.h>
typedef HermesExecutorFactory ExecutorFactory;
#else
#import <React/JSCExecutorFactory.h>
typedef JSCExecutorFactory ExecutorFactory;
#endif

#ifndef DONT_AUTOINSTALL_REANIMATED

@interface RCTEventDispatcher(Reanimated)

- (void)setBridge:(RCTBridge*)bridge;

@end

@implementation UIResponder (Reanimated)
- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  [bridge moduleForClass:[RCTEventDispatcher class]];
  RCTEventDispatcher *eventDispatcher = [REAEventDispatcher new];
  [eventDispatcher setBridge:bridge];
  [bridge updateModuleWithInstance:eventDispatcher];
   _bridge_reanimated = bridge;
  __weak __typeof(self) weakSelf = self;

  const auto executor = [weakSelf, bridge](facebook::jsi::Runtime &runtime) {
    if (!bridge) {
      return;
    }
    __typeof(self) strongSelf = weakSelf;
    if (strongSelf) {
#ifdef NEW_CALL_INVOKER
      auto callInvoker = bridge.jsCallInvoker;
#else
      auto callInvoker = std::make_shared<react::BridgeJSCallInvoker>(bridge.reactInstance);
#endif
      auto reanimatedModule = reanimated::createReanimatedModule(callInvoker);
      runtime.global().setProperty(runtime,
                                   jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
                                   jsi::Object::createFromHostObject(runtime, reanimatedModule));
    }
  };

  // installs globals such as console, nativePerformanceNow, etc.
  return std::make_unique<ExecutorFactory>(RCTJSIExecutorRuntimeInstaller(executor));
}

@end

#endif
