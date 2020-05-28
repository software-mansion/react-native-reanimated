
#import "RETurboModuleProvider.h"
#import <React/CoreModulesPlugins.h>
#import <NativeReanimatedModule.h>
#import <jsi/JSCRuntime.h>
#import "NativeProxy.h"

// NOTE: This entire file should be codegen'ed.

namespace facebook {
namespace react {

Class RETurboModuleClassProvider(const char *name) {
  return RCTCoreModulesClassProvider(name);
}

std::shared_ptr<TurboModule> RETurboModuleProvider(const std::string &name, std::shared_ptr<CallInvoker> jsInvoker) {
  if (name == "NativeReanimated") {
    return reanimated::createReanimatedModule(jsInvoker);
  }

  return nullptr;
}

std::shared_ptr<TurboModule> RETurboModuleProvider(const std::string &name,
                                                         id<RCTTurboModule> instance,
                                                         std::shared_ptr<CallInvoker> jsInvoker) {
  return nullptr;
}

} // namespace react
} // namespace facebook
