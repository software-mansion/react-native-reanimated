#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

void ObjectPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.getObject(rt);

  jsi::Array propertyNames = keyframesObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const jsi::Value &keyframes = keyframesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propertyName));
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframes(rt, shadowNode, keyframes);
  }
}

void ObjectPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const jsi::Array propertyNames = newStyleValue.isObject()
      ? newStyleValue.asObject(rt).getPropertyNames(rt)
      : oldStyleValue.asObject(rt).getPropertyNames(rt);
  const size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt,
        shadowNode,
        oldStyleValue.isObject()
            ? oldStyleValue.asObject(rt).getProperty(rt, propertyName.c_str())
            : jsi::Value::undefined(),
        newStyleValue.isObject()
            ? newStyleValue.asObject(rt).getProperty(rt, propertyName.c_str())
            : jsi::Value::undefined());
  }
}

jsi::Value ObjectPropertiesInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    std::function<jsi::Value(Interpolator &)> callback) const {
  jsi::Object result(rt);
  bool allUndefined = true;

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = callback(*interpolator);

    if (!value.isUndefined()) {
      allUndefined = false;
    }

    result.setProperty(rt, propName.c_str(), value);
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

} // namespace reanimated
