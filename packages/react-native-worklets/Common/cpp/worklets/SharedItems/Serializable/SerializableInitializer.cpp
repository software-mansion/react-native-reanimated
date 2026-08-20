#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableInitializer.h>

#include <memory>
#include <mutex>
#include <utility>

using namespace facebook;

namespace worklets {

jsi::Value SerializableInitializer::toJSValue(jsi::Runtime &rt) {
  if (remoteValue_ == nullptr) {
    auto initObj = initializer_->toJSValue(rt);
    auto value = std::make_unique<jsi::Value>(
        getValueUnpacker(rt).call(rt, initObj, jsi::String::createFromAscii(rt, "Handle")));

    // We are locking the initialization here since the thread that is
    // initializing can be preempted on runtime lock. E.g.
    // UI thread can be preempted on initialization of a shared value and then
    // JS thread can try to access the shared value, locking the whole runtime.
    // If we put the lock on `getValueUnpacker` part (basically any part that
    // requires runtime) we would get a deadlock since UI thread would never
    // release it.
    std::unique_lock<std::mutex> lock(initializationMutex_);
    if (remoteValue_ == nullptr) {
      remoteValue_ = std::move(value);
      remoteRuntime_ = &rt;
    }
  }
  if (&rt == remoteRuntime_) {
    return jsi::Value(rt, *remoteValue_);
  }
  auto initObj = initializer_->toJSValue(rt);
  return getValueUnpacker(rt).call(rt, initObj, jsi::String::createFromAscii(rt, "Handle"));
}

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject) {
  const auto serializable = std::make_shared<SerializableInitializer>(rt, initializerObject);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
