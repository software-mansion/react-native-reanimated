#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>

#include <memory>
#include <mutex>

namespace worklets {

class SerializableInitializer : public Serializable {
 private:
  // We don't release the initializer since the handle can get
  // initialized in parallel on multiple threads. However this is not a problem,
  // since the final value is taken from a cache on the runtime which guarantees
  // sequential access.
  std::unique_ptr<SerializableObject> initializer_;
  std::unique_ptr<facebook::jsi::Value> remoteValue_;
  mutable std::mutex initializationMutex_;
  facebook::jsi::Runtime *remoteRuntime_;

 public:
  SerializableInitializer(facebook::jsi::Runtime &rt, const facebook::jsi::Object &initializerObject)
      : Serializable(ValueType::HandleType),
        initializer_(std::make_unique<SerializableObject>(rt, initializerObject)) {}

  ~SerializableInitializer() override {
    cleanupRuntimeAware(remoteRuntime_, remoteValue_);
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;
};

facebook::jsi::Value makeSerializableInitializer(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &initializerObject);

} // namespace worklets
