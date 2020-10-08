#import "REABridgeDelegate.h"
#import <React/RCTCxxBridgeDelegate.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/REAModule.h>
#import <React/JSCExecutorFactory.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>

@interface REABridgeDelegate (RCTCxxBridgeDelegate)

@end

@implementation REABridgeDelegate {
  id<RCTBridgeDelegate> _delegate;
}

- (instancetype)initWithDelegate:(id<RCTBridgeDelegate>)delegate
{
  if (self = [super init]) {
    _delegate = delegate;
  }
  return self;
}

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
   _bridge_reanimated = bridge;
  __weak __typeof(self) weakSelf = self;
  return std::make_unique<facebook::react::JSCExecutorFactory>([weakSelf, bridge](facebook::jsi::Runtime &runtime) {
    if (!bridge) {
      return;
    }
    __typeof(self) strongSelf = weakSelf;
    if (strongSelf) {
      auto reanimatedModule = reanimated::createReanimatedModule(bridge.jsCallInvoker);
      runtime.global().setProperty(runtime,
                                   jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
                                   jsi::Object::createFromHostObject(runtime, reanimatedModule)
      );
    }
  });
}

- (id)forwardingTargetForSelector:(SEL)sel
{
    if ([_delegate respondsToSelector:sel]) return _delegate;
    return nil;
}

@end
