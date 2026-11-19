#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  // jsi_utils::addMethod<0>(rt, obj, "commentedOut", [](jsi::Runtime &, const jsi::Value &) {});
  jsi_utils::addMethod<0>(rt, obj, "noArguments", [](jsi::Runtime &, const jsi::Value &) {});
  jsi_utils::addMethod<2>(
      rt,
      obj,
      /* name */ "twoArguments",
      [prefix = std::string("(, ")](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&)[2]) {
        return jsi::String::createFromUtf8(rt, prefix + ")");
      });
  return obj;
}

} // namespace worklets
