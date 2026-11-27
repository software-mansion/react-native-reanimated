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
#ifndef NDEBUG
  jsi_utils::addMethod(
      rt, obj, "typedArguments", [](jsi::Runtime &, double, const jsi::Object &second) {});
#else
  jsi_utils::addMethod(rt, obj, "typedArguments", [](jsi::Runtime &, double first, jsi::Object second) {});
#endif
  jsi_utils::addMethod(
      rt, obj, "moduleArguments", weak_from_this(), [](jsi::Runtime &, Module &self, double first) {});
  jsi_utils::addMethod(rt, obj, "scalarArguments", [](jsi::Runtime &, int, const jsi::String &, bool) {});
  jsi_utils::addMethod(
      rt,
      obj,
      "objectArguments",
      [](jsi::Runtime &, const jsi::Array &, jsi::Function, const jsi::ArrayBuffer &, jsi::Object, double) {});
  return obj;
}

} // namespace worklets
