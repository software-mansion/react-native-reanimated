#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableSet.h>

#include <memory>
#include <utility>

using namespace facebook;

namespace worklets {

SerializableSet::SerializableSet(jsi::Runtime &rt, const jsi::Array &values) : Serializable(ValueType::SetType) {
  auto size = values.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractSerializableOrThrow(rt, values.getValueAtIndex(rt, i)));
  }
}

jsi::Value SerializableSet::toJSValue(jsi::Runtime &rt) {
  const auto values = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    values.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }

  const auto &global = rt.global();
  auto set = global.getPropertyAsFunction(rt, "Set").callAsConstructor(rt, std::move(values));

  return set;
}

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableSet>(rt, values);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
