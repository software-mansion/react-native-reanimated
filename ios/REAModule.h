#ifdef RCT_NEW_ARCH_ENABLED
#import <RNReanimated/NewestShadowNodesRegistry.h>
#import <RNReanimated/ReanimatedUIManagerBinding.h>
#endif

#import <RNReanimated/REANodesManager.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#ifdef RCT_NEW_ARCH_ENABLED
using namespace reanimated;
#endif

@interface REAModule
    : RCTEventEmitter <RCTBridgeModule, RCTEventDispatcherObserver, RCTUIManagerObserver, RCTSurfacePresenterObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;

- (void)installReanimatedUIManagerBindingAfterReload;

@end
