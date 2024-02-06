#include "REATurboCppModule.h"
#include "NativeProxy.h"

namespace facebook::react {

REATurboCppModule::REATurboCppModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeREATurboCppModuleCxxSpec(std::move(jsInvoker)) {}

bool REATurboCppModule::installBridgeless(jsi::Runtime& rt, jsi::String valueUnpackerCode) {
     reanimated::bridgelessRnRuntime = &rt;
     reanimated::bridgelessCallInvoker = jsInvoker_;
//    RCTExecuteOnMainQueue(^{
    // id appDelegate = [[UIApplication sharedApplication] delegate];
    //     RCTModuleRegistry *moduleRegistry =
    //         (RCTModuleRegistry *)[[appDelegate valueForKey:@"_reactHost"] valueForKey:@"_moduleRegistry"];
    //     if (moduleRegistry) {
    //         REAModule *reaModule = [moduleRegistry moduleForName:"ReanimatedModule"];
    //         [reaModule installBridgelessWithRuntime:&rt jsCallInvoker:jsInvoker_ valueUnpackerCode:std::move(valueUnpackerCode)];
    //     }
//    });
//   return YES;
    return true;
}

} // namespace facebook::react
