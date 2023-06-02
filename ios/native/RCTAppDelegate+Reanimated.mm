#import <RNReanimated/RCTAppDelegate+Reanimated.h>
#import <RNReanimated/REAInitializer.h>
#import <objc/runtime.h>

#ifndef RCT_NEW_ARCH_ENABLED
#ifndef DONT_AUTOINSTALL_REANIMATED

@implementation RCTAppDelegate (Reanimated)

- (std::unique_ptr<facebook::react::JSExecutorFactory>)swizzled_jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  reanimated::REAInitializer(bridge);
  return [self swizzled_jsExecutorFactoryForBridge:bridge]; // call the original method
}

+ (void)load
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    Class cls = [self class];
    Method originalMethod = class_getInstanceMethod(cls, @selector(jsExecutorFactoryForBridge:));
    Method swizzledMethod = class_getInstanceMethod(cls, @selector(swizzled_jsExecutorFactoryForBridge:));
    method_exchangeImplementations(originalMethod, swizzledMethod);
  });
}

@end

#endif // DONT_AUTOINSTALL_REANIMATED
#endif // RCT_NEW_ARCH_ENABLED
