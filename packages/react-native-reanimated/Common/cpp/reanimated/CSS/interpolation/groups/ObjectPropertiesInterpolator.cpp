#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

ObjectPropertiesInterpolator::ObjectPropertiesInterpolator(
    const PropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath),
      factories_(factories),
      viewStylesRepository_(viewStylesRepository) {}

jsi::Value ObjectPropertiesInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(rt, [&](PropertyInterpolator &interpolator) {
    return interpolator.getStyleValue(rt, shadowNode);
  });
}

jsi::Value ObjectPropertiesInterpolator::getCurrentValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(rt, [&](PropertyInterpolator &interpolator) {
    return interpolator.getCurrentValue(rt, shadowNode);
  });
}

jsi::Value ObjectPropertiesInterpolator::update(
    const PropertyInterpolationUpdateContext &context) {
  return mapInterpolators(context.rt, [&](PropertyInterpolator &interpolator) {
    return interpolator.update(context);
  });
}

jsi::Value ObjectPropertiesInterpolator::reset(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  return mapInterpolators(rt, [&](PropertyInterpolator &interpolator) {
    return interpolator.reset(rt, shadowNode);
  });
}

void ObjectPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.getObject(rt);

  jsi::Array propertyNames = keyframesObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const jsi::Value &propertyKeyframes = keyframesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propertyName));
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframes(rt, propertyKeyframes);
  }
}

void ObjectPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
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
      const auto newInterpolator = createPropertyInterpolator(
          propertyName, propertyPath_, factories_, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt,
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
    const std::function<jsi::Value(PropertyInterpolator &)> &callback) const {
  jsi::Object result(rt);

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = callback(*interpolator);
    result.setProperty(rt, propName.c_str(), value);
  }

  return result;
}

} // namespace reanimated
