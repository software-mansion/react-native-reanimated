#import <React/RCTBridgeModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REAAnimationsManager.h>

#ifdef RCT_NEW_ARCH_ENABLED
@interface REAModule : RCTEventEmitter <RCTBridgeModule, RCTEventDispatcherObserver, RCTSurfacePresenterObserver>
#else
@interface REAModule : RCTEventEmitter <RCTBridgeModule, RCTEventDispatcherObserver, RCTUIManagerObserver>
#endif

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property (nonatomic, readonly) REAAnimationsManager *animationsManager;

#ifdef RCT_NEW_ARCH_ENABLED
- (void)installReanimatedAfterReload;
#endif

@end
