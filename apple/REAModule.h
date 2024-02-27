#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTInitializing.h>
#import <rnreanimated/rnreanimated.h>
#import <ReactCommon/RCTRuntimeExecutor.h>
#import <React/RCTRuntimeExecutorModule.h>
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
                        RCTRuntimeExecutorModule,
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
