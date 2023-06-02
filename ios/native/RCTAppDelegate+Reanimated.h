#import <Foundation/Foundation.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import <React-cxxreact/cxxreact/JSExecutor.h>

#ifndef RCT_NEW_ARCH_ENABLED
#ifndef DONT_AUTOINSTALL_REANIMATED

@interface RCTAppDelegate (Reanimated)

- (std::unique_ptr<facebook::react::JSExecutorFactory>)swizzled_jsExecutorFactoryForBridge:(RCTBridge *)bridge;

@end

#endif // DONT_AUTOINSTALL_REANIMATED
#endif // RCT_NEW_ARCH_ENABLED
