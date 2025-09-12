#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

#include <algorithm>

namespace reanimated::css {

ArrayPropertiesInterpolator::ArrayPropertiesInterpolator(
    const InterpolatorFactoriesArray &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository),
      factories_(factories) {}

bool ArrayPropertiesInterpolator::equalsReversingAdjustedStartValue(
    const folly::dynamic &propertyValue) const {
  if (!propertyValue.isArray()) {
    return false;
  }

  const auto valuesCount = propertyValue.size();
  if (valuesCount != interpolators_.size()) {
    return false;
  }

  for (size_t i = 0; i < valuesCount; ++i) {
    if (!interpolators_[i]->equalsReversingAdjustedStartValue(
            propertyValue[i])) {
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
    interpolators_[i]->updateKeyframes(
        rt, keyframesArray.getValueAtIndex(rt, i));
  }
}

void ArrayPropertiesInterpolator::updateKeyframesFromStyleChange(
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  const auto emptyArray = folly::dynamic::array();
  const auto null = folly::dynamic();

  const auto &oldStyleArray =
      oldStyleValue.empty() ? emptyArray : oldStyleValue;
  const auto &newStyleArray =
      newStyleValue.empty() ? emptyArray : newStyleValue;
  const auto &lastUpdateArray =
      lastUpdateValue.empty() ? emptyArray : lastUpdateValue;

  const size_t oldSize = oldStyleArray.size();
  const size_t newSize = newStyleArray.size();
  const size_t lastSize = lastUpdateArray.size();
  const size_t valuesCount = std::max(oldSize, newSize);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    // These index checks ensure that interpolation works between 2 arrays
    // with different lengths
    interpolators_[i]->updateKeyframesFromStyleChange(
        i < oldSize ? oldStyleArray[i] : null,
        i < newSize ? newStyleArray[i] : null,
        i < lastSize ? lastUpdateArray[i] : null);
  }
}

folly::dynamic ArrayPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
    const {
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
    interpolators_.emplace_back(createPropertyInterpolator(
        interpolators_.size(),
        propertyPath_,
        factories_,
        viewStylesRepository_));
  }
}

} // namespace reanimated::css
