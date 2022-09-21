#include "WorkletsCache.h"
#include "FrozenObject.h"
#include "ShareableValue.h"

#include <string>
#include <utility>

using namespace facebook;

namespace reanimated {

jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

jsi::Function function(jsi::Runtime &rt, const std::string &code) {
  return eval(rt, ("(" + code + ")").c_str()).getObject(rt).getFunction(rt);
}

std::shared_ptr<jsi::Function> WorkletsCache::getFunction(
    jsi::Runtime &rt,
    std::shared_ptr<FrozenObject> frozenObj) {
  long long workletHash =
      ValueWrapper::asNumber(frozenObj->map["__workletHash"]->valueContainer);
  if (worklets.count(workletHash) == 0) {
    // We need to add a newline before the closing bracket, because in debug
    // builds the last line will be a source map, which is a comment and that
    // would make the bracket part of the comment and cause an error due to a
    // missing closing bracket.
    auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
        "(" +
        ValueWrapper::asString(frozenObj->map["asString"]->valueContainer) +
        "\n)");
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
