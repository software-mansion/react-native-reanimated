#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableHostFunction.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

jsi::Value SerializableHostFunction::toJSValue(jsi::Runtime &rt) {
  return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forUtf8(rt, name_), paramCount_, hostFunction_);
}

jsi::Value makeSerializableHostFunction(
    jsi::Runtime &rt,
    const jsi::HostFunctionType &function,
    const std::string &name,
    unsigned int paramCount) {
  auto serializable = std::make_shared<SerializableHostFunction>(function, name, paramCount);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
