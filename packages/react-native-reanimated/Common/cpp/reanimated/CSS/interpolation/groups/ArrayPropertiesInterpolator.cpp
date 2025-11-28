#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

#include <algorithm>
#include <memory>

namespace reanimated::css {

ArrayPropertiesInterpolator::ArrayPropertiesInterpolator(
    const InterpolatorFactoriesArray &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository), factories_(factories) {}

void ArrayPropertiesInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  const jsi::Array keyframesArray = keyframes.asObject(rt).asArray(rt);
  const size_t valuesCount = keyframesArray.size(rt);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    interpolators_[i]->updateKeyframes(rt, keyframesArray.getValueAtIndex(rt, i));
  }
}

bool ArrayPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  const auto oldStyleArray = oldStyleValue.isUndefined() ? jsi::Array(rt, 0) : oldStyleValue.asObject(rt).asArray(rt);
  const auto newStyleArray = newStyleValue.isUndefined() ? jsi::Array(rt, 0) : newStyleValue.asObject(rt).asArray(rt);

  const size_t oldSize = oldStyleArray.size(rt);
  const size_t newSize = newStyleArray.size(rt);
  const size_t valuesCount = std::max(oldSize, newSize);

  resizeInterpolators(valuesCount);

  bool areAllPropsReversed = true;

  for (size_t i = 0; i < valuesCount; ++i) {
    // These index checks ensure that interpolation works between 2 arrays
    // with different lengths
    areAllPropsReversed &= interpolators_[i]->updateKeyframesFromStyleChange(
        rt,
        i < oldSize ? oldStyleArray.getValueAtIndex(rt, i) : jsi::Value::undefined(),
        i < newSize ? newStyleArray.getValueAtIndex(rt, i) : jsi::Value::undefined());
  }

  return areAllPropsReversed;
}

folly::dynamic ArrayPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const {
  auto result = folly::dynamic::array();

  for (size_t i = 0; i < interpolators_.size(); ++i) {
    result.push_back(callback(*interpolators_[i]));
  }

  return result;
}

void ArrayPropertiesInterpolator::resizeInterpolators(size_t valuesCount) {
  // Remove excess interpolators if the array size has decreased
  if (interpolators_.size() > valuesCount) {
    interpolators_.resize(valuesCount);
  }

  while (interpolators_.size() < valuesCount) {
    interpolators_.emplace_back(
        createPropertyInterpolator(interpolators_.size(), propertyPath_, factories_, viewStylesRepository_));
  }
}

} // namespace reanimated::css
