#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>
#import <rnreanimated/rnreanimated.h>

#import <reanimated/apple/REANodesManager.h>

@interface REAModule : RCTEventEmitter <
                           NativeReanimatedModuleSpec,
                           RCTCallInvokerModule,
                           RCTEventDispatcherObserver,
                           RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;

@end
