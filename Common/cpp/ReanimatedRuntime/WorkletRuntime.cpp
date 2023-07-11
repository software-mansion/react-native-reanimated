#include "WorkletRuntime.h"

namespace reanimated {

WorkletRuntime::WorkletRuntime(
    const std::string &name,
    const std::string &valueUnpackerCode)
    : name_(name) {
  // TODO: decorate runtime
  // TODO: support JSC/Hermes/V8
  runtime_ = facebook::hermes::makeHermesRuntime();

  jsi::Runtime &rt = *runtime_;

  rt.global().setProperty(rt, "global", rt.global());
  // resolves "ReferenceError: Property 'global' doesn't exist at ..."

  RuntimeDecorator::decorateRuntime(rt, name_);

  auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
      "(" + valueUnpackerCode + "\n)");
  auto valueUnpacker =
      rt.evaluateJavaScript(codeBuffer, "nowhere").asObject(rt).asFunction(rt);
  rt.global().setProperty(rt, "__valueUnpacker", valueUnpacker);

  // TODO: install callGuardDEV
  // TODO: install _makeShareableClone
  // TODO: install _scheduleOnJS
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

std::shared_ptr<jsi::Runtime> runtimeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return value.getObject(rt).getHostObject<WorkletRuntime>(rt)->getRuntime();
}

} // namespace reanimated
