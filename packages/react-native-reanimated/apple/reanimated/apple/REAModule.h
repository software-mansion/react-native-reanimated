#ifdef RCT_NEW_ARCH_ENABLED
#if REACT_NATIVE_MINOR_VERSION >= 75
#import <React/RCTCallInvokerModule.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 75
#import <rnreanimated/rnreanimated.h>
#else // RCT_NEW_ARCH_ENABLED
#import <React/RCTBridgeModule.h>
#endif // RCT_NEW_ARCH_ENABLED
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
#import <reanimated/apple/REANodesManager.h>

@interface REAModule : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                       <NativeReanimatedModuleSpec,
#if REACT_NATIVE_MINOR_VERSION >= 75
                        RCTCallInvokerModule,
#endif // REACT_NATIVE_MINOR_VERSION >= 75
#else
                       <RCTBridgeModule,
#endif // RCT_NEW_ARCH_ENABLED
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

@end
