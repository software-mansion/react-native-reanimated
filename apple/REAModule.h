#ifdef RCT_NEW_ARCH_ENABLED
#import <rnreanimated/rnreanimated.h>
#else
#import <React/RCTBridgeModule.h>
#endif // RCT_NEW_ARCH_ENABLED
#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REANodesManager.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

@interface REAModule : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                       <NativeReanimatedModuleSpec,
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
