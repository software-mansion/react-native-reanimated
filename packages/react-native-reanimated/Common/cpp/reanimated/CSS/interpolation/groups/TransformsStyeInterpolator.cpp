#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

void TransformsStyleInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const auto transformsArray = keyframes.asObject(rt).asArray(rt);

  auto [transformsMap, orderedPropertyNames] =
      extractTransformsMapAndOrderedProperties(rt, transformsArray);
  orderedPropertyNames_ = orderedPropertyNames;

  for (const auto &propertyName : orderedPropertyNames) {
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframes(
        rt, shadowNode, transformsMap.at(propertyName));
  }
}

void TransformsStyleInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  auto oldArray = oldStyleValue.isUndefined()
      ? jsi::Array(rt, 0)
      : oldStyleValue.asObject(rt).asArray(rt);
  auto newArray = newStyleValue.isUndefined()
      ? jsi::Array(rt, 0)
      : newStyleValue.asObject(rt).asArray(rt);

  auto [oldTransformsMap, oldOrder] =
      extractTransformsMapAndOrderedProperties(rt, oldArray);
  auto [newTransformsMap, newOrder] =
      extractTransformsMapAndOrderedProperties(rt, newArray);

  std::unordered_set<std::string> addedProperties;
  PropertyNames orderedPropertyNames;

  for (const auto &storedPropertyName : orderedPropertyNames_) {
    if (oldTransformsMap.find(storedPropertyName) == oldTransformsMap.end() &&
        newTransformsMap.find(storedPropertyName) == newTransformsMap.end()) {
      addedProperties.insert(storedPropertyName);
      orderedPropertyNames.emplace_back(storedPropertyName);
    }
  }
  for (const auto &oldPropertyName : oldOrder) {
    if (addedProperties.find(oldPropertyName) == addedProperties.end() &&
        newTransformsMap.find(oldPropertyName) == newTransformsMap.end()) {
      addedProperties.insert(oldPropertyName);
      orderedPropertyNames.emplace_back(oldPropertyName);
    }
  }
  orderedPropertyNames.insert(
      orderedPropertyNames.end(), newOrder.begin(), newOrder.end());
  orderedPropertyNames_ = orderedPropertyNames;

  for (const auto &propertyName : orderedPropertyNames) {
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    const auto oldValueIt = oldTransformsMap.find(propertyName);
    const auto &oldValue = oldValueIt != oldTransformsMap.end()
        ? std::move(oldValueIt->second)
        : jsi::Value::undefined();

    const auto newValueIt = newTransformsMap.find(propertyName);
    const auto &newValue = newValueIt != newTransformsMap.end()
        ? std::move(newValueIt->second)
        : jsi::Value::undefined();

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt, shadowNode, oldValue, newValue);
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
