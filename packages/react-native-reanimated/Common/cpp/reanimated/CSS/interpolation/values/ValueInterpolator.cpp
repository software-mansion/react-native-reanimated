#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <utility>

namespace reanimated::css {

ValueInterpolator::ValueInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<CSSValue> &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(propertyPath, viewStylesRepository),
      defaultStyleValue_(defaultValue),
      defaultStyleValueDynamic_(defaultValue->toDynamic()) {}

folly::dynamic ValueInterpolator::getStyleValue(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return viewStylesRepository_->getStyleProp(
      shadowNode->getTag(), propertyPath_);
}

folly::dynamic ValueInterpolator::getResetStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  auto styleValue = getStyleValue(shadowNode);

  if (styleValue.isNull()) {
    return defaultStyleValueDynamic_;
  }

  return styleValue;
}

folly::dynamic ValueInterpolator::getFirstKeyframeValue() const {
  return convertOptionalToDynamic(keyframes_.front().value);
}

folly::dynamic ValueInterpolator::getLastKeyframeValue() const {
  return convertOptionalToDynamic(keyframes_.back().value);
}

bool ValueInterpolator::equalsReversingAdjustedStartValue(
    const folly::dynamic &propertyValue) const {
  if (reversingAdjustedStartValue_.isNull()) {
    return propertyValue.isNull();
  }
  return reversingAdjustedStartValue_ == propertyValue;
}

void ValueInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  keyframes_.clear();
  keyframes_.reserve(parsedKeyframes.size());

  for (const auto &[offset, value] : parsedKeyframes) {
    if (value.isUndefined()) {
      keyframes_.emplace_back(offset, std::nullopt);
    } else {
      keyframes_.emplace_back(
          offset, std::make_optional(createValue(rt, value)));
    }
  }
}

void ValueInterpolator::updateKeyframesFromStyleChange(
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  ValueKeyframe firstKeyframe, lastKeyframe;

  if (!lastUpdateValue.isNull()) {
    firstKeyframe = ValueKeyframe{0, createValue(lastUpdateValue)};
  } else if (!oldStyleValue.isNull()) {
    firstKeyframe = ValueKeyframe{0, createValue(oldStyleValue)};
  } else {
    firstKeyframe = ValueKeyframe{0, defaultStyleValue_};
  }

  if (newStyleValue.isNull()) {
    lastKeyframe = ValueKeyframe{1, defaultStyleValue_};
  } else {
    lastKeyframe = ValueKeyframe{1, createValue(newStyleValue)};
  }

  keyframes_ = {std::move(firstKeyframe), std::move(lastKeyframe)};
  reversingAdjustedStartValue_ = oldStyleValue;
}

folly::dynamic ValueInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  const auto toIndex = getToKeyframeIndex(progressProvider);
  const auto fromIndex = toIndex - 1;

  const auto &fromKeyframe = keyframes_[fromIndex];
  const auto &toKeyframe = keyframes_[toIndex];

  // clang-format off
  const auto &fromValue = fromKeyframe.value
      ? fromKeyframe.value.value()
      : getFallbackValue(shadowNode);
  const auto &toValue = toKeyframe.value
      ? toKeyframe.value.value()
      : getFallbackValue(shadowNode);
  // clang-format on

  const auto keyframeProgress = progressProvider->getKeyframeProgress(
      fromKeyframe.offset, toKeyframe.offset);

  if (keyframeProgress == 1.0) {
    return toValue->toDynamic();
  }
  if (keyframeProgress == 0.0) {
    return fromValue->toDynamic();
  }

  return interpolateValue(
      keyframeProgress, fromValue, toValue, {.node = shadowNode});
}

folly::dynamic ValueInterpolator::convertOptionalToDynamic(
    const std::optional<std::shared_ptr<CSSValue>> &value) const {
  return value ? value.value()->toDynamic() : folly::dynamic();
}

std::shared_ptr<CSSValue> ValueInterpolator::getFallbackValue(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto styleValue = getStyleValue(shadowNode);
  return styleValue.isNull() ? defaultStyleValue_ : createValue(styleValue);
}

size_t ValueInterpolator::getToKeyframeIndex(
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  const auto progress = progressProvider->getGlobalProgress();

  const auto it = std::upper_bound(
      keyframes_.begin(),
      keyframes_.end(),
      progress,
      [](double progress, const ValueKeyframe &keyframe) {
        return progress < keyframe.offset;
      });

  // If we're at the end, return the last valid keyframe index
  if (it == keyframes_.end()) {
    return keyframes_.size() - 1;
  }

  return std::distance(keyframes_.begin(), it);
}

} // namespace reanimated::css
