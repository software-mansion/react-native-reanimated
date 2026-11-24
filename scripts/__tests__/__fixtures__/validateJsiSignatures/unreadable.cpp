#include <worklets/Tools/WorkletsJSIUtils.h>

namespace worklets {

using namespace facebook;

jsi::Object makeProxy(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  const char *name = "noArguments";
  jsi_utils::addMethod(rt, obj, name, [](jsi::Runtime &) {});
  return obj;
}

} // namespace worklets
