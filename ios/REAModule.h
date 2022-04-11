#import <RNReanimated/NewestShadowNodesRegistry.h>
#import <RNReanimated/REANodesManager.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

using namespace reanimated;

@interface REAModule
    : RCTEventEmitter <RCTBridgeModule, RCTEventDispatcherObserver, RCTUIManagerObserver, RCTSurfacePresenterObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;

// TODO: refactor NewestShadowNodesRegistry initialization
- (std::shared_ptr<NewestShadowNodesRegistry>)getNewestShadowNodesRegistry;

@end
