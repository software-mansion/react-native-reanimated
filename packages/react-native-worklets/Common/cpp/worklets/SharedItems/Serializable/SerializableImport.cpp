#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableImport.h>

#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableImport::toJSValue(jsi::Runtime &rt) {
  /**
   * The only way to obtain a module in runtime is to use the Metro's require
   * method implementation, which is injected into the global object as `__r`.
   */
  const auto metroRequire = rt.global().getProperty(rt, "__r");
  if (metroRequire.isUndefined()) {
    return jsi::Value::undefined();
  }

  const auto imported = jsi::String::createFromUtf8(rt, imported_);
  return metroRequire.asObject(rt).asFunction(rt).call(rt, source_).asObject(rt).getProperty(rt, imported);
}

jsi::Value makeSerializableImport(jsi::Runtime &rt, const double source, const jsi::String &imported) {
  auto serializable = std::make_shared<SerializableImport>(rt, source, imported);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
