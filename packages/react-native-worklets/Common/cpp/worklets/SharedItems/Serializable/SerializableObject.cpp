#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/RetainingSerializable.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>

#include <memory>

using namespace facebook;

namespace worklets {

SerializableObject::SerializableObject(jsi::Runtime &rt, const jsi::Object &object)
    : Serializable(ValueType::ObjectType) {
  auto propertyNames = object.getPropertyNames(rt);
  auto size = propertyNames.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = propertyNames.getValueAtIndex(rt, i).asString(rt);
    auto value = extractSerializableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(key.utf8(rt), value);
  }
  if (object.hasNativeState(rt)) {
    nativeState_ = object.getNativeState(rt);
  }
}

SerializableObject::SerializableObject(jsi::Runtime &rt, const jsi::Object &object, const jsi::Value &nativeStateSource)
    : SerializableObject(rt, object) {
  if (nativeStateSource.isObject() && nativeStateSource.asObject(rt).hasNativeState(rt)) {
    nativeState_ = nativeStateSource.asObject(rt).getNativeState(rt);
  }
}

jsi::Value SerializableObject::toJSValue(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  for (const auto &i : data_) {
    obj.setProperty(rt, jsi::String::createFromUtf8(rt, i.first), i.second->toJSValue(rt));
  }
  if (nativeState_ != nullptr) {
    obj.setNativeState(rt, nativeState_);
  }
  return obj;
}

jsi::Value makeSerializableObject(
    jsi::Runtime &rt,
    jsi::Object object,
    bool shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote) {
    serializable = std::make_shared<RetainingSerializable<SerializableObject>>(rt, object, nativeStateSource);
  } else {
    serializable = std::make_shared<SerializableObject>(rt, object, nativeStateSource);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
