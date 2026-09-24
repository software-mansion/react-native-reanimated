#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/RetainingSerializable.h>
#include <worklets/SharedItems/Serializable/SerializableArray.h>

#include <memory>

using namespace facebook;

namespace worklets {

SerializableArray::SerializableArray(jsi::Runtime &rt, const jsi::Array &array) : Serializable(ValueType::ArrayType) {
  auto size = array.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractSerializableOrThrow(rt, array.getValueAtIndex(rt, i)));
  }
}

jsi::Value SerializableArray::toJSValue(jsi::Runtime &rt) {
  auto size = data_.size();
  auto ary = jsi::Array(rt, size);
  for (size_t i = 0; i < size; i++) {
    ary.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }
  return ary;
}

jsi::Value makeSerializableArray(jsi::Runtime &rt, const jsi::Array &array, const jsi::Value &shouldRetainRemote) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
    serializable = std::make_shared<RetainingSerializable<SerializableArray>>(rt, array);
  } else {
    serializable = std::make_shared<SerializableArray>(rt, array);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
