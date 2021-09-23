#import "REAInitializer.h"
#import "REAUIManager.h"

#import <React-Fabric/react/renderer/uimanager/UIManager.h> // ReanimatedListener

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
    /*[bridge moduleForClass:[RCTUIManager class]];
    REAUIManager* reaUiManager = [REAUIManager new];
    [reaUiManager setBridge:bridge];
    RCTUIManager* uiManager = reaUiManager;
    [bridge updateModuleWithInstance:uiManager];*/
  
    /*[bridge moduleForClass:[RCTEventDispatcher class]];
    RCTEventDispatcher *eventDispatcher = [REAEventDispatcher new];
    [eventDispatcher setBridge:bridge];
    [bridge updateModuleWithInstance:eventDispatcher];*/
    _bridge_reanimated = bridge;
    const auto runtimeInstaller = [bridge, runtimeInstallerToWrap](facebook::jsi::Runtime &runtime) {
      if (!bridge) {
        return;
      }
    if (runtimeInstallerToWrap) {
        runtimeInstallerToWrap(runtime);
    }
        
    facebook::react::ReanimatedListener::handleEvent = [](RawEvent& rawEvent){
        std::cerr << "[Reanimated] " << rawEvent.type << std::endl;
    };

    auto reanimatedModule = reanimated::createReanimatedModule(bridge.jsCallInvoker);
    runtime.global().setProperty(runtime,
                                 jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
                                 jsi::Object::createFromHostObject(runtime, reanimatedModule));
        
    };
    return runtimeInstaller;
}


}


