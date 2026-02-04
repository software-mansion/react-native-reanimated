#if __cplusplus

#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REANodesManager.h>

@interface WorkletsModule : NSObject
- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;
@end

namespace reanimated {

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule);

} // namespace reanimated

#endif //__cplusplus
