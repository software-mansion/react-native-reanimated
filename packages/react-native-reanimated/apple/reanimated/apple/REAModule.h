#import <React/RCTCallInvokerModule.h>
#import <rnreanimated/rnreanimated.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
#import <reanimated/apple/REANodesManager.h>

@interface REAModule : RCTEventEmitter
                       <NativeReanimatedModuleSpec,
                        RCTCallInvokerModule,
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

@end
