#include "WorkletRuntime.h"
#include "RuntimeDecorator.h"
#include "WorkletRuntimeCollector.h"

namespace reanimated {

WorkletRuntime::WorkletRuntime(const std::string &name) : name_(name) {
  runtime_ = ReanimatedRuntime::make(name);

  WorkletRuntimeCollector::install(*runtime_);

  jsi::Runtime &rt = *runtime_;

  rt.global().setProperty(rt, "global", rt.global());
  // resolves "ReferenceError: Property 'global' doesn't exist at ..."

  RuntimeDecorator::decorateRuntime(rt, name_);
}

void WorkletRuntime::installValueUnpacker(
    const std::string &valueUnpackerCode) {
  jsi::Runtime &rt = *runtime_;
  auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
      "(" + valueUnpackerCode + "\n)");
  auto valueUnpacker = rt.evaluateJavaScript(codeBuffer, "installValueUnpacker")
                           .asObject(rt)
                           .asFunction(rt);
  rt.global().setProperty(rt, "__valueUnpacker", valueUnpacker);
}

jsi::Value WorkletRuntime::get(
    jsi::Runtime &rt,
    const jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "toString") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [this](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t)
            -> jsi::Value {
          return jsi::String::createFromUtf8(rt, toString());
        });
  }
  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> WorkletRuntime::getPropertyNames(
    jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, "toString"));
  return result;
}

std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return value.getObject(rt).getHostObject<WorkletRuntime>(rt);
}

} // namespace reanimated
