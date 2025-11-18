#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <worklets/Tools/JSISerializer.h>

#include <memory>
#include <utility>

namespace reanimated::css {

PropertyInterpolator::PropertyInterpolator(
    PropertyPath propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : propertyPath_(std::move(propertyPath)), viewStylesRepository_(viewStylesRepository) {}

bool PropertyInterpolatorFactory::isDiscreteProperty() const {
  return false;
}

std::string PropertyInterpolator::getPropertyPathString() const {
  if (propertyPath_.empty()) {
    return "";
  }

  std::string result = propertyPath_[0];
  for (size_t i = 1; i < propertyPath_.size(); ++i) {
    result += "." + propertyPath_[i];
  }
  return result;
}

std::vector<std::pair<double, jsi::Value>> PropertyInterpolator::parseJSIKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) const {
  if (!keyframes.isObject() || !keyframes.asObject(rt).isArray(rt)) {
    throw std::invalid_argument(
        "[Reanimated] Received invalid keyframes object for property: " + getPropertyPathString() +
        ".\n\nExpected an array of objects with 'offset' and 'value' properties, got: " +
        worklets::stringifyJSIValue(rt, keyframes));
  }

  const auto keyframeArray = keyframes.asObject(rt).asArray(rt);
  const auto keyframesCount = keyframeArray.size(rt);

  const auto getKeyframeAtIndexOffset = [&](size_t index) -> double {
    return keyframeArray.getValueAtIndex(rt, index).asObject(rt).getProperty(rt, "offset").asNumber();
  };

  const bool hasOffset0 = getKeyframeAtIndexOffset(0) == 0;
  const bool hasOffset1 = getKeyframeAtIndexOffset(keyframesCount - 1) == 1;

  std::vector<std::pair<double, jsi::Value>> result;
  result.reserve(keyframesCount + (hasOffset0 ? 0 : 1) + (hasOffset1 ? 0 : 1));

  // Insert the keyframe without value at offset 0 if it is not present
  if (!hasOffset0) {
    result.emplace_back(0.0, jsi::Value::undefined());
  }

  // Insert all provided keyframes
  for (size_t i = 0; i < keyframesCount; ++i) {
    jsi::Object keyframeObject = keyframeArray.getValueAtIndex(rt, i).asObject(rt);
    double offset = keyframeObject.getProperty(rt, "offset").asNumber();
    jsi::Value value = keyframeObject.getProperty(rt, "value");

    result.emplace_back(offset, std::move(value));
  }

  // Insert the keyframe without value at offset 1 if it is not present
  if (!hasOffset1) {
    result.emplace_back(1.0, jsi::Value::undefined());
  }

  return result;
}

} // namespace reanimated::css
