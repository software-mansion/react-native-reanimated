#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

#include <algorithm>
#include <memory>

namespace reanimated::css {

ArrayPropertiesInterpolator::ArrayPropertiesInterpolator(
    const InterpolatorFactoriesArray &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository), factories_(factories) {}

bool ArrayPropertiesInterpolator::equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const {
  if (!propertyValue.isArray()) {
    return false;
  }

  const auto valuesCount = propertyValue.size();
  if (valuesCount != interpolators_.size()) {
    return false;
  }

  for (size_t i = 0; i < valuesCount; ++i) {
    if (!interpolators_[i]->equalsReversingAdjustedStartValue(propertyValue[i])) {
      return false;
    }
  }

  return true;
}

void ArrayPropertiesInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  const jsi::Array keyframesArray = keyframes.asObject(rt).asArray(rt);
  const size_t valuesCount = keyframesArray.size(rt);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    interpolators_[i]->updateKeyframes(rt, keyframesArray.getValueAtIndex(rt, i));
  }
}

void ArrayPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  const auto getArray = [&rt](const jsi::Value &value) -> std::optional<jsi::Array> {
    if (!value.isObject()) {
      return std::nullopt;
    }

    const auto object = value.asObject(rt);
    if (!object.isArray(rt)) {
      return std::nullopt;
    }

    return object.asArray(rt);
  };

  const auto oldArray = getArray(oldStyleValue);
  const auto newArray = getArray(newStyleValue);

  const size_t oldSize = oldArray.has_value() ? oldArray->size(rt) : 0;
  const size_t newSize = newArray.has_value() ? newArray->size(rt) : 0;
  const size_t valuesCount = std::max(oldSize, newSize);

  resizeInterpolators(valuesCount);

  for (size_t i = 0; i < valuesCount; ++i) {
    const auto oldValue = (oldArray.has_value() && i < oldSize) ? oldArray->getValueAtIndex(rt, i) : jsi::Value::undefined();
    const auto newValue = (newArray.has_value() && i < newSize) ? newArray->getValueAtIndex(rt, i) : jsi::Value::undefined();
    interpolators_[i]->updateKeyframesFromStyleChange(rt, oldValue, newValue);
  }
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
