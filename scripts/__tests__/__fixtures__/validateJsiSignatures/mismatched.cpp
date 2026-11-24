#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  jsi_utils::addMethod(rt, obj, "twoArguments", [](jsi::Runtime &, double first) {});
  jsi_utils::addMethod(rt, obj, "undeclared", [](jsi::Runtime &) {});
  jsi_utils::addMethod(rt, obj, "typedArguments", [](jsi::Runtime &, double first) {});
  jsi_utils::addMethod(
      rt, obj, "moduleArguments", weak_from_this(), [](jsi::Runtime &, Module &self, double first, bool second) {});
  jsi_utils::addMethod(
      rt, obj, "scalarArguments", [](jsi::Runtime &, bool first, double second, const std::string &third) {});
  jsi_utils::addMethod(
      rt,
      obj,
      "objectArguments",
      [](jsi::Runtime &, jsi::Function array, jsi::Array callback, jsi::Object buffer, jsi::ArrayBuffer value, Custom anything) {});
  return obj;
}

} // namespace worklets
