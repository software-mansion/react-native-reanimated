#include "WorkletsCache.h"
#include "FrozenObject.h"
#include "ShareableValue.h"

using namespace facebook;

namespace reanimated {

std::shared_ptr<jsi::Function> WorkletsCache::getFunction(
    jsi::Runtime &rt,
    std::shared_ptr<FrozenObject> frozenObj) {
  long long workletHash =
      ValueWrapper::asNumber(frozenObj->map["__workletHash"]->valueContainer);
  if (worklets.count(workletHash) == 0) {
    auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
        "(" +
        ValueWrapper::asString(frozenObj->map["__reanimated_workletFunction"]->valueContainer) +
        ")");
    auto func = rt.evaluateJavaScript(
                      codeBuffer,
                      ValueWrapper::asString(
                          frozenObj->map["__location"]->valueContainer))
                    .asObject(rt)
                    .asFunction(rt);
    worklets[workletHash] = std::make_shared<jsi::Function>(std::move(func));
  }
  return worklets[workletHash];
}

} // namespace reanimated
