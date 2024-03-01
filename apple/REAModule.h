#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTInitializing.h>
#if REACT_NATIVE_MINOR_VERSION >= 74
#import <React/RCTRuntimeExecutorModule.h>
#import <ReactCommon/RCTRuntimeExecutor.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#import <rnreanimated/rnreanimated.h>
#else
#import <React/RCTBridgeModule.h>
#endif
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REANodesManager.h>

@interface REAModule : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                       <NativeReanimatedModuleSpec,
                        RCTInitializing,
#if REACT_NATIVE_MINOR_VERSION >= 74
                        RCTRuntimeExecutorModule,
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#else
                       <RCTBridgeModule,
#endif
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

#ifdef RCT_NEW_ARCH_ENABLED
- (void)installReanimatedAfterReload;
#endif

@end
