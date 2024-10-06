#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

std::pair<std::string, jsi::Value> extractTransformPropertyAndValue(
    jsi::Runtime &rt,
    const jsi::Object &transformObject) {
  jsi::Array propertyNames = transformObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  if (propertiesCount != 1) {
    throw std::invalid_argument(
        "[Reanimated] Invalid transform object in CSS style.");
  }

  std::string propName =
      propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  jsi::Value propValue = transformObject.getProperty(rt, propName.c_str());

  return std::make_pair(propName, std::move(propValue));
}

std::pair<std::unordered_map<std::string, jsi::Value>, std::vector<std::string>>
extractTransformMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformArray) {
  std::unordered_map<std::string, jsi::Value> transformMap;
  std::vector<std::string> orderedPropertyNames;

  for (size_t i = 0; i < transformArray.size(rt); i++) {
    jsi::Value arrayElement = transformArray.getValueAtIndex(rt, i);
    if (arrayElement.isObject()) {
      jsi::Object transformObject = arrayElement.asObject(rt);

      auto [propertyName, propertyValue] =
          extractTransformPropertyAndValue(rt, transformObject);
      transformMap[propertyName] = std::move(propertyValue);
      orderedPropertyNames.push_back(propertyName);
    }
  }

  return {std::move(transformMap), std::move(orderedPropertyNames)};
}

void TransformsStyleInterpolator::setKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  // TODO - add a possibility to remove interpolators that are no longer used
  // (for now, for simplicity, we only add new ones)
  const auto keyframesArray = keyframes.asObject(rt).asArray(rt);

  auto [transformsMap, orderedPropertyNames] =
      extractTransformMapAndOrderedProperties(rt, keyframesArray);
  orderedPropertyNames_ = orderedPropertyNames;

  for (const auto &propertyName : orderedPropertyNames) {
    addOrUpdateInterpolator(rt, propertyName, transformsMap.at(propertyName));
  }
}

jsi::Value TransformsStyleInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    std::function<jsi::Value(Interpolator &)> callback) const {
  jsi::Array result(rt, interpolators_.size());
  size_t index = 0;

  for (const auto &propertyName : orderedPropertyNames_) {
    const auto &interpolator = interpolators_.at(propertyName);
    jsi::Value value = callback(*interpolator);

    if (!value.isUndefined()) {
      jsi::Object obj(rt);
      obj.setProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName), value);
      result.setValueAtIndex(rt, index++, obj);
    }
  }

  // If no results were added, return undefined
  if (index == 0) {
    return jsi::Value::undefined();
  }

  return result;
}

} // namespace reanimated
