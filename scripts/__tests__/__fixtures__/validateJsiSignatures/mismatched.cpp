#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  jsi_utils::addMethod<1>(rt, obj, "twoArguments", [](jsi::Runtime &, const jsi::Value &, const jsi::Value(&)[1]) {});
  jsi_utils::addMethod<0>(rt, obj, "undeclared", [](jsi::Runtime &, const jsi::Value &) {});
  jsi_utils::addMethod(rt, obj, "typedArguments", [](jsi::Runtime &, double first) {});
  jsi_utils::addMethod(
      rt, obj, "moduleArguments", weak_from_this(), [](jsi::Runtime &, Module &self, double first, bool second) {});
  return obj;
}

} // namespace worklets
