#ifdef RCT_NEW_ARCH_ENABLED
#if REACT_NATIVE_MINOR_VERSION >= 77
#import <React/RCTCallInvokerModule.h>
#else
#import <React/RCTInitializing.h>
#if REACT_NATIVE_MINOR_VERSION >= 74
#import <React/RCTRuntimeExecutorModule.h>
#import <ReactCommon/RCTRuntimeExecutor.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#endif // REACT_NATIVE_MINOR_VERSION >= 77
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
#if REACT_NATIVE_MINOR_VERSION >= 77
                        RCTCallInvokerModule,
#else
                        RCTInitializing,
#if REACT_NATIVE_MINOR_VERSION >= 74
                        RCTRuntimeExecutorModule,
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#endif // REACT_NATIVE_MINOR_VERSION >= 77
#else
                       <RCTBridgeModule,
#endif // RCT_NEW_ARCH_ENABLED
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

#ifdef RCT_NEW_ARCH_ENABLED
- (void)installReanimatedAfterReload;
#endif // RCT_NEW_ARCH_ENABLED

@end
