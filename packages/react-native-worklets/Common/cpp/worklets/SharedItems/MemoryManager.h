#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <mutex>
#include <vector>

namespace worklets {
class MemoryManager {
 public:
  void loadAllCustomSerializables(const std::shared_ptr<WorkletRuntime> &workletRuntime);

  void loadCustomSerializable(
      const std::shared_ptr<WorkletRuntime> &workletRuntime,
      const CustomSerializableData &data);

  void registerCustomSerializable(const CustomSerializableData &data);

 private:
  static jsi::Array getCustomSerializationRegistry(jsi::Runtime &rt);

  void loadCustomSerializable(jsi::Runtime &runtime, const jsi::Array &registry, const CustomSerializableData &data);

  std::mutex customSerializablesMutex_;
  std::vector<CustomSerializableData> customSerializables_;
};
} // namespace worklets
