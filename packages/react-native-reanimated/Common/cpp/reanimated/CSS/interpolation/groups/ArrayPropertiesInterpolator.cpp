#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

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
    const folly::dynamic &keyframes) {
  const size_t valuesCount = keyframes.size();

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    interpolators_[i]->updateKeyframes(keyframes[i]);
  }
}

void ArrayPropertiesInterpolator::updateKeyframesFromStyleChange(
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  const folly::dynamic empty = folly::dynamic::array();
  const auto oldStyleArray = !oldStyleValue.empty() ? oldStyleValue : empty;
  const auto newStyleArray = !newStyleValue.empty() ? newStyleValue : empty;
  const auto lastUpdateArray =
      !lastUpdateValue.empty() ? lastUpdateValue : empty;

  const size_t oldSize = oldStyleArray.size();
  const size_t newSize = newStyleArray.size();
  const size_t valuesCount = std::max(oldSize, newSize);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    // These index checks ensure that interpolation works between 2 arrays
    // with different lengths
    interpolators_[i]->updateKeyframesFromStyleChange(
        i < oldSize ? oldStyleArray[i] : empty,
        i < newSize ? newStyleArray[i] : empty,
        i < valuesCount ? lastUpdateArray[i] : empty);
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
