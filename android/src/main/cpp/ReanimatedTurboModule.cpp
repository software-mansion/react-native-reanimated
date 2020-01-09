#include "ReanimatedTurboModule.h"

using namespace facebook;

namespace facebook {
namespace react {

ReanimatedTurboModule::ReanimatedTurboModule(const std::string &name): name_(name){}

ReanimatedTurboModule::~ReanimatedTurboModule() {}

jsi::Value ReanimatedTurboModule::get(
    jsi::Runtime &runtime,
    const jsi::PropNameID &propName) {
  std::string propNameUtf8 = propName.utf8(runtime);
  auto p = methodMap_.find(propNameUtf8);
  if (p == methodMap_.end()) {
    // Method was not found, let JS decide what to do.
    return jsi::Value::undefined();
  }
  MethodMetadata meta = p->second;
  return jsi::Function::createFromHostFunction(
      runtime,
      propName,
      meta.argCount,
      [this, meta](
          facebook::jsi::Runtime &rt,
          const facebook::jsi::Value &thisVal,
          const facebook::jsi::Value *args,
          size_t count) { return meta.invoker(rt, *this, args, count); });
}

} // namespace react
} // namespace facebook