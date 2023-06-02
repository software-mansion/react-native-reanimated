#import <RNReanimated/REAInitializer.h>
#import <RNReanimated/UIResponder+Reanimated.h>
#import <React-cxxreact/cxxreact/JSExecutor.h>
#import <objc/runtime.h>

#ifndef RCT_NEW_ARCH_ENABLED
#ifndef DONT_AUTOINSTALL_REANIMATED

@implementation UIResponder (Reanimated)

- (std::unique_ptr<facebook::react::JSExecutorFactory>)swizzled_jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  reanimated::REAInitializer(bridge);
  return [self swizzled_jsExecutorFactoryForBridge:bridge];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  static bool swizzled = false;
  if (!swizzled) {
    swizzled = true; // AppDelegate doesn't change during reload, don't swizzle again
    Class cls = [bridge.delegate class];
    Method originalMethod = class_getInstanceMethod(cls, @selector(jsExecutorFactoryForBridge:));
    Method swizzledMethod = class_getInstanceMethod(cls, @selector(swizzled_jsExecutorFactoryForBridge:));
    method_exchangeImplementations(originalMethod, swizzledMethod);
  }
  return nil;
}

@end

#endif // DONT_AUTOINSTALL_REANIMATED
#endif // RCT_NEW_ARCH_ENABLED
