#include "WorkletsCache.h"
#include "ShareableValue.h"
#include "FrozenObject.h"

using namespace facebook;

namespace reanimated
{

jsi::Function WorkletsCache::functionFromString(jsi::Runtime &rt, const std::string &code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, ("(" + code + ")").c_str()).getObject(rt).getFunction(rt);
}

std::shared_ptr<jsi::Function> WorkletsCache::obtainFunction(jsi::Runtime &rt, const std::string &code) {
  jsi::Function fun = functionFromString(rt, code);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));
  return std::move(funPtr);
}

std::shared_ptr<jsi::Function> WorkletsCache::getFunction(jsi::Runtime &rt, std::shared_ptr<FrozenObject> frozenObj, const int customThreadId) {
  if (customThreadId != -1) {
    // worklets cache wouldn't work for custom threads as every time we have a different RT
    return obtainFunction(rt, frozenObj->map["asString"]->stringValue);
  }
  long long workletHash = frozenObj->map["__workletHash"]->numberValue;
  if (worklets.count(workletHash) == 0) {
    worklets[workletHash] = obtainFunction(rt, frozenObj->map["asString"]->stringValue);
  }
  return worklets[workletHash];
}

}