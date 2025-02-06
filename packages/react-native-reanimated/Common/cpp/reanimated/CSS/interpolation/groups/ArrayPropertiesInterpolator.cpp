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
  auto getArrayFromStyle = [&rt](const jsi::Value &style) {
    if (!style.isObject()) {
      return jsi::Array(rt, 0);
    }
    auto obj = style.asObject(rt);
    return obj.isArray(rt) ? obj.asArray(rt) : jsi::Array(rt, 0);
  };

  const auto oldStyleArray = getArrayFromStyle(oldStyleValue);
  const auto newStyleArray = getArrayFromStyle(newStyleValue);

  const size_t valuesCount =
      std::max(oldStyleArray.size(rt), newStyleArray.size(rt));

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    // These index checks ensure that interpolation works between 2 arrays
    // with different lengths
    const auto oldValue = oldStyleArray.size(rt) > i
        ? oldStyleArray.getValueAtIndex(rt, i)
        : jsi::Value::undefined();
    const auto newValue = newStyleArray.size(rt) > i
        ? newStyleArray.getValueAtIndex(rt, i)
        : jsi::Value::undefined();

    interpolators_[i]->updateKeyframesFromStyleChange(rt, oldValue, newValue);
  }
}

void ArrayPropertiesInterpolator::forEachInterpolator(
    const std::function<void(PropertyInterpolator &)> &callback) const {
  for (const auto &interpolator : interpolators_) {
    callback(*interpolator);
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

folly::dynamic ArrayPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const {
  auto result = folly::dynamic::array();

  for (size_t i = 0; i < interpolators_.size(); ++i) {
    folly::dynamic value = callback(*interpolators_[i]);
    result.push_back(value);
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
