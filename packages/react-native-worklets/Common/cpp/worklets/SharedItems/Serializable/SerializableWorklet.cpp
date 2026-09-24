#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/RetainingSerializable.h>
#include <worklets/SharedItems/Serializable/SerializableWorklet.h>

#include <algorithm>
#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableWorklet::toJSValue(jsi::Runtime &rt) {
  react_native_assert(
      std::any_of(data_.cbegin(), data_.cend(), [](const auto &item) { return item.first == "__workletHash"; }) &&
      "SerializableWorklet doesn't have `__workletHash` property");
  jsi::Value obj = SerializableObject::toJSValue(rt);
  return getValueUnpacker(rt).call(rt, obj, jsi::String::createFromAscii(rt, "Worklet"));
}

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const jsi::Object &object, const bool &shouldRetainRemote) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote) {
    serializable = std::make_shared<RetainingSerializable<SerializableWorklet>>(rt, object);
  } else {
    serializable = std::make_shared<SerializableWorklet>(rt, object);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
