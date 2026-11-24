#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  // jsi_utils::addMethod(rt, obj, "commentedOut", [](jsi::Runtime &) {});
  jsi_utils::addMethod(rt, obj, "noArguments", [](jsi::Runtime &) {});
  jsi_utils::addMethod(
      rt,
      obj,
      /* name */ "twoArguments",
      [prefix = std::string("(, ")](jsi::Runtime &rt, double, const std::optional<std::string> &) {
        return jsi::String::createFromUtf8(rt, prefix + ")");
      });
  jsi_utils::addMethod(
      rt, obj, "typedArguments", [](jsi::Runtime &, double, const std::map<int, std::string> &second) {});
  jsi_utils::addMethod(
      rt, obj, "moduleArguments", weak_from_this(), [](jsi::Runtime &, Module &self, double first) {});
  return obj;
}

} // namespace worklets
