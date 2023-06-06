#if REACT_NATIVE_MINOR_VERSION >= 72 && !defined(RCT_NEW_ARCH_ENABLED) && !defined(DONT_AUTOINSTALL_REANIMATED)

#import <Foundation/Foundation.h>
#import <React-RCTAppDelegate/RCTAppDelegate.h>
#import <React-cxxreact/cxxreact/JSExecutor.h>

@interface RCTAppDelegate (Reanimated)

- (std::unique_ptr<facebook::react::JSExecutorFactory>)reanimated_jsExecutorFactoryForBridge:(RCTBridge *)bridge;

@end

#endif
