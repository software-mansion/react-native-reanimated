#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>

#import <rnreanimated/rnreanimated.h>

#import <reanimated/apple/REANodesManager.h>

@interface ReanimatedModule : RCTEventEmitter <
                                  NativeReanimatedModuleSpec,
                                  RCTTurboModuleWithJSIBindings,
                                  RCTEventDispatcherObserver,
                                  RCTInvalidating>

@property (nonatomic, readonly) REANodesManager *nodesManager;

@end
