#import "REAInitializer.h"

@interface RCTEventDispatcher(Reanimated)

- (void)setBridge:(RCTBridge*)bridge;

@end

namespace reanimated {

using namespace facebook;
using namespace react;

JSIExecutor::RuntimeInstaller REAJSIExecutorRuntimeInstaller(
    RCTBridge* bridge,
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap)
{
    [bridge moduleForClass:[RCTEventDispatcher class]];
    RCTEventDispatcher *eventDispatcher = [REAEventDispatcher new];
    [eventDispatcher setBridge:bridge];
    [bridge updateModuleWithInstance:eventDispatcher];
     _bridge_reanimated = bridge;
    const auto runtimeInstaller = [bridge, runtimeInstallerToWrap](facebook::jsi::Runtime &runtime) {
      if (!bridge) {
        return;
      }
#if RNVERSION >= 63
    auto reanimatedModule = reanimated::createReanimatedModule(bridge.jsCallInvoker);
#else
    auto callInvoker = std::make_shared<react::BridgeJSCallInvoker>(bridge.reactInstance);
    auto reanimatedModule = reanimated::createReanimatedModule(callInvoker);
#endif
    runtime.global().setProperty(runtime,
                                 jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
                                 jsi::Object::createFromHostObject(runtime, reanimatedModule));
        
        if (runtimeInstallerToWrap) {
            runtimeInstallerToWrap(runtime);
        }
    };
    return runtimeInstaller;
}


}
