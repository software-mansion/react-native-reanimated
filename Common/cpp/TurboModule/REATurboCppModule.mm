#include "REATurboCppModule.h"

 #include <RNReanimated/REAModule.h>

namespace facebook::react {

REATurboCppModule::REATurboCppModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeREATurboCppModuleCxxSpec(std::move(jsInvoker)) {}

bool REATurboCppModule::installBridgeless(jsi::Runtime& rt, jsi::String valueUnpackerCode) {
//    RCTExecuteOnMainQueue(^{
    id appDelegate = [[UIApplication sharedApplication] delegate];
        RCTModuleRegistry *moduleRegistry =
            (RCTModuleRegistry *)[[appDelegate valueForKey:@"_reactHost"] valueForKey:@"_moduleRegistry"];
        if (moduleRegistry) {
            REAModule *reaModule = [moduleRegistry moduleForName:"ReanimatedModule"];
            [reaModule installBridgelessWithRuntime:&rt jsCallInvoker:jsInvoker_ valueUnpackerCode:std::move(valueUnpackerCode)];
        }
//    });
  return YES;
}

} // namespace facebook::react
