#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/SerializableMap.h>

#include <memory>
#include <utility>

using namespace facebook;

namespace worklets {

SerializableMap::SerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values)
    : Serializable(ValueType::MapType) {
  auto size = keys.size(rt);
  react_native_assert(size == values.size(rt) && "Keys and values arrays must have the same size.");
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = extractSerializableOrThrow(rt, keys.getValueAtIndex(rt, i));
    auto value = extractSerializableOrThrow(rt, values.getValueAtIndex(rt, i));
    data_.emplace_back(key, value);
  }
}

jsi::Value SerializableMap::toJSValue(jsi::Runtime &rt) {
  const auto keyValues = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    const auto pair = jsi::Array(rt, 2);
    pair.setValueAtIndex(rt, 0, data_[i].first->toJSValue(rt));
    pair.setValueAtIndex(rt, 1, data_[i].second->toJSValue(rt));
    keyValues.setValueAtIndex(rt, i, std::move(pair));
  }

  const auto &global = rt.global();
  auto map = global.getPropertyAsFunction(rt, "Map").callAsConstructor(rt, std::move(keyValues));

  return map;
}

jsi::Value makeSerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableMap>(rt, keys, values);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
