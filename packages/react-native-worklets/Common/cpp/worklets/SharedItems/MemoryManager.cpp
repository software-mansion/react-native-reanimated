#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/MemoryManager.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

namespace worklets {
void MemoryManager::loadAllCustomSerializables(const std::shared_ptr<WorkletRuntime> &runtime) {
  std::lock_guard lock(customSerializablesMutex_);
  runtime->executeSync([&](jsi::Runtime &rt) -> jsi::Value {
    const auto registry = getCustomSerializationRegistry(rt);
    for (const auto &data : customSerializables_) {
      loadCustomSerializable(rt, registry, data);
    }
    return jsi::Value::undefined();
  });
};

void MemoryManager::loadCustomSerializable(
    const std::shared_ptr<WorkletRuntime> &runtime,
    CustomSerializableData data) {
  std::lock_guard lock(customSerializablesMutex_);
  runtime->executeSync([this, data](jsi::Runtime &rt) -> jsi::Value {
    const auto registry = getCustomSerializationRegistry(rt);
    loadCustomSerializable(rt, registry, data);
    return jsi::Value::undefined();
  });
}

void MemoryManager::loadCustomSerializable(
    jsi::Runtime &runtime,
    const jsi::Array &registry,
    CustomSerializableData data) {
  react_native_assert(
      registry.length(runtime) == data.typeId && "Custom serializable type IDs must not differ between runtimes.");

  const auto item = jsi::Object(runtime);
  item.setProperty(runtime, "determinant", data.determinant->toJSValue(runtime));
  item.setProperty(runtime, "serializer", data.serializer->toJSValue(runtime));
  item.setProperty(runtime, "deserializer", data.deserializer->toJSValue(runtime));
  item.setProperty(runtime, "typeId", data.typeId);

  registry.getPropertyAsFunction(runtime, "push").callWithThis(runtime, registry, item);
}

void MemoryManager::registerCustomSerializable(CustomSerializableData data) {
  std::lock_guard lock(customSerializablesMutex_);
  customSerializables_.emplace_back(data);
}

jsi::Array MemoryManager::getCustomSerializationRegistry(jsi::Runtime &rt) {
  //   const auto global = rt.global();
  const auto data = rt.global().getProperty(rt, "__customSerializationRegistry");
  //   if (data.isUndefined()) {
  //     auto arr = jsi::Array(rt, 0);
  //     global.setProperty(rt, "__customSerializationRegistry", arr);
  //     return arr;
  //   }
  return data.asObject(rt).asArray(rt);
}

} // namespace worklets
