#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManagerObserverCoordinator.h>

#import <rnreanimated/rnreanimated.h>

#import <reanimated/apple/REANodesManager.h>

@interface ReanimatedModule
    : RCTEventEmitter <NativeReanimatedModuleSpec, RCTCallInvokerModule, RCTEventDispatcherObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;

@end
