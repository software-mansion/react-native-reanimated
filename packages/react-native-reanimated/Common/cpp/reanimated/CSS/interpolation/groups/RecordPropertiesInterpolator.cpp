#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

namespace reanimated {

RecordPropertiesInterpolator::RecordPropertiesInterpolator(
    const InterpolatorFactoriesRecord &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(
          propertyPath,
          progressProvider,
          viewStylesRepository),
      factories_(factories) {}

bool RecordPropertiesInterpolator::equalsReversingAdjustedStartValue(
    jsi::Runtime &rt,
    const jsi::Value &propertyValue) const {
  const auto propertyValuesObject = propertyValue.asObject(rt);
  const auto propertyNames = propertyValuesObject.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propValue = propertyValuesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propName));

    const auto interpolatorIt = interpolators_.find(propName);
    if (interpolatorIt == interpolators_.end() ||
        !interpolatorIt->second->equalsReversingAdjustedStartValue(
            rt, propValue)) {
      return false;
    }
  }

  return true;
}

void RecordPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.asObject(rt);

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
          propertyName,
          propertyPath_,
          factories_,
          progressProvider_,
          viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframes(rt, propertyKeyframes);
  }
}

void RecordPropertiesInterpolator::updateKeyframesFromStyleChange(
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
          propertyName,
          propertyPath_,
          factories_,
          progressProvider_,
          viewStylesRepository_);
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

jsi::Value RecordPropertiesInterpolator::mapInterpolators(
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

#endif // RCT_NEW_ARCH_ENABLED
