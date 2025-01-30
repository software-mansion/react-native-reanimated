#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

namespace reanimated {

ArrayPropertiesInterpolator::ArrayPropertiesInterpolator(
    const InterpolatorFactoriesArray &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(
          propertyPath,
          progressProvider,
          viewStylesRepository),
      factories_(factories) {}

bool ArrayPropertiesInterpolator::equalsReversingAdjustedStartValue(
    jsi::Runtime &rt,
    const jsi::Value &propertyValue) const {
  const auto propertyValuesArray = propertyValue.asObject(rt).asArray(rt);
  const auto valuesCount = propertyValuesArray.size(rt);

  if (valuesCount != interpolators_.size()) {
    return false;
  }

  for (size_t i = 0; i < valuesCount; ++i) {
    if (!interpolators_[i]->equalsReversingAdjustedStartValue(
            rt, propertyValuesArray.getValueAtIndex(rt, i))) {
      return false;
    }
  }

  return true;
}

void ArrayPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  const jsi::Array keyframesArray = keyframes.asObject(rt).asArray(rt);
  const size_t valuesCount = keyframesArray.size(rt);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    const jsi::Value &valueKeyframes = keyframesArray.getValueAtIndex(rt, i);
    interpolators_[i]->updateKeyframes(rt, valueKeyframes);
  }
}

void ArrayPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  const size_t valuesCount = newStyleValue.isObject()
      ? newStyleValue.asObject(rt).asArray(rt).size(rt)
      : oldStyleValue.asObject(rt).asArray(rt).size(rt);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    interpolators_[i]->updateKeyframesFromStyleChange(
        rt,
        oldStyleValue.isObject()
            ? oldStyleValue.asObject(rt).asArray(rt).getValueAtIndex(rt, i)
            : jsi::Value::undefined(),
        newStyleValue.isObject()
            ? newStyleValue.asObject(rt).asArray(rt).getValueAtIndex(rt, i)
            : jsi::Value::undefined());
  }
}

jsi::Value ArrayPropertiesInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    const std::function<jsi::Value(PropertyInterpolator &)> &callback) const {
  jsi::Array result(rt, interpolators_.size());

  for (size_t i = 0; i < interpolators_.size(); ++i) {
    jsi::Value value = callback(*interpolators_[i]);
    result.setValueAtIndex(rt, i, value);
  }

  return result;
}

void ArrayPropertiesInterpolator::resizeInterpolators(size_t valuesCount) {
  // Remove excess interpolators if the array size has decreased
  if (interpolators_.size() > valuesCount) {
    interpolators_.resize(valuesCount);
  }

  while (interpolators_.size() < valuesCount) {
    const auto newInterpolator = createPropertyInterpolator(
        interpolators_.size(),
        propertyPath_,
        factories_,
        progressProvider_,
        viewStylesRepository_);
    interpolators_.push_back(newInterpolator);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
