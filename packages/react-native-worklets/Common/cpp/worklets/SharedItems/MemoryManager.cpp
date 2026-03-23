#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/MemoryManager.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

namespace worklets {
void MemoryManager::loadAllCustomSerializables(const std::shared_ptr<WorkletRuntime> &runtime) {
  std::lock_guard lock(customSerializationDataMutex_);
  runtime->executeSync([&](jsi::Runtime &rt) -> jsi::Value {
    const auto registry = getCustomSerializationRegistry(rt);
    for (const auto &data : customSerializationData_) {
      loadCustomSerializable(rt, registry, data);
    }
    return jsi::Value::undefined();
  });
}

void MemoryManager::loadCustomSerializable(
    const std::shared_ptr<WorkletRuntime> &runtime,
    const SerializationData &data) {
  std::lock_guard lock(customSerializationDataMutex_);
  runtime->executeSync([this, data](jsi::Runtime &rt) -> jsi::Value {
    const auto registry = getCustomSerializationRegistry(rt);
    loadCustomSerializable(rt, registry, data);
    return jsi::Value::undefined();
  });
}

void MemoryManager::loadCustomSerializable(
    jsi::Runtime &runtime,
    const jsi::Array &registry,
    const SerializationData &data) {
  react_native_assert(
      registry.length(runtime) == data.typeId &&
      ("Custom serializable type ID must match registry length. Expected typeId: " + std::to_string(data.typeId) +
       ", got registry length: " + std::to_string(registry.length(runtime)) +
       ". Custom serializables must be registered in the same order across all runtimes.")
          .c_str());

  const auto item = jsi::Object(runtime);
  item.setProperty(runtime, "determine", data.determine->toJSValue(runtime));
  item.setProperty(runtime, "pack", data.pack->toJSValue(runtime));
  item.setProperty(runtime, "unpack", data.unpack->toJSValue(runtime));
  item.setProperty(runtime, "typeId", data.typeId);

  registry.getPropertyAsFunction(runtime, "push").callWithThis(runtime, registry, item);
}

void MemoryManager::registerCustomSerializable(const SerializationData &data) {
  std::lock_guard lock(customSerializationDataMutex_);
  customSerializationData_.emplace_back(data);
}

jsi::Array MemoryManager::getCustomSerializationRegistry(jsi::Runtime &rt) {
  const auto data = rt.global().getProperty(rt, "__customSerializationRegistry");
  return data.asObject(rt).asArray(rt);
}

} // namespace worklets
