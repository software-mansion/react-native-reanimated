#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
#ifdef IAMNEVERDEFINED
  jsi_utils::addMethod<0>(rt, obj, "noArguments", [](jsi::Runtime &, const jsi::Value &) {});
#endif
  return obj;
}

} // namespace worklets
