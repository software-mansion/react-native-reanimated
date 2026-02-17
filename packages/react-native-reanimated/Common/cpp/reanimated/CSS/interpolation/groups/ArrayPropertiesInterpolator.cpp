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

bool ArrayPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &fromValue,
    const jsi::Value &toValue) {
  const auto fromArray = fromValue.isUndefined() ? jsi::Array(rt, 0) : fromValue.asObject(rt).asArray(rt);
  const auto toArray = toValue.isUndefined() ? jsi::Array(rt, 0) : toValue.asObject(rt).asArray(rt);

  const size_t fromSize = fromArray.size();
  const size_t toSize = toArray.size();
  const size_t valuesCount = std::max(fromSize, toSize);

  resizeInterpolators(valuesCount);

  bool areAllPropsReversed = true;

  for (size_t i = 0; i < valuesCount; ++i) {
    // These index checks ensure that interpolation works between 2 arrays
    // with different lengths
    areAllPropsReversed &= interpolators_[i]->updateKeyframes(
        i < fromSize ? fromArray.getValueAtIndex(rt, i) : jsi::Value::undefined(),
        i < toSize ? toArray.getValueAtIndex(rt, i) : jsi::Value::undefined());
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
