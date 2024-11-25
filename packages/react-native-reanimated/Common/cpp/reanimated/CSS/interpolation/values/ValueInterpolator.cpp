#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

template <typename T>
ValueInterpolator<T>::ValueInterpolator(
    const PropertyPath &propertyPath,
    const std::optional<T> &defaultStyleValue,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(
          propertyPath,
          progressProvider,
          viewStylesRepository),
      defaultStyleValue_(defaultStyleValue) {}

template <typename T>
jsi::Value ValueInterpolator<T>::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return viewStylesRepository_->getStyleProp(
      rt, shadowNode->getTag(), propertyPath_);
}

template <typename T>
jsi::Value ValueInterpolator<T>::getCurrentValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  if (previousValue_.has_value()) {
    return convertResultToJSI(rt, previousValue_.value());
  }
  auto styleValue = getStyleValue(rt, shadowNode);
  if (!styleValue.isUndefined()) {
    return styleValue;
  }
  if (defaultStyleValue_.has_value()) {
    return convertResultToJSI(rt, defaultStyleValue_.value());
  }
  return jsi::Value::undefined();
}

template <typename T>
jsi::Value ValueInterpolator<T>::getFirstKeyframeValue(jsi::Runtime &rt) const {
  return convertOptionalToJSI(rt, keyframes_.front().value);
}

template <typename T>
jsi::Value ValueInterpolator<T>::getLastKeyframeValue(jsi::Runtime &rt) const {
  return convertOptionalToJSI(rt, keyframes_.back().value);
}

template <typename T>
void ValueInterpolator<T>::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  keyframeAfterIndex_ = 1;
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  keyframes_.clear();
  keyframes_.reserve(parsedKeyframes.size());

  for (const auto &[offset, value] : parsedKeyframes) {
    if (value.isUndefined()) {
      keyframes_.push_back({offset, std::nullopt});
    } else {
      keyframes_.push_back({offset, prepareKeyframeValue(rt, value)});
    }
  }
}

template <typename T>
void ValueInterpolator<T>::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  keyframeAfterIndex_ = 1;
  ValueKeyframe<T> firstKeyframe, lastKeyframe;

  // If the transition was interrupted, use the previous interpolation
  // result as the first keyframe value
  if (previousValue_.has_value()) {
    firstKeyframe = {0, previousValue_};
  } else {
    // If the new transition of the property was started, use the old style
    // value as the first keyframe value if it was provided
    if (!oldStyleValue.isUndefined()) {
      firstKeyframe = {0, prepareKeyframeValue(rt, oldStyleValue)};
    } else {
      // Otherwise, fallback to the default style value is no style value was
      // provided for the view property
      firstKeyframe = {0, defaultStyleValue_};
    }
  }

  // Animate to the default style value if the target value is undefined
  if (newStyleValue.isUndefined()) {
    lastKeyframe = {1, defaultStyleValue_};
  } else {
    lastKeyframe = {1, prepareKeyframeValue(rt, newStyleValue)};
  }

  keyframes_ = {firstKeyframe, lastKeyframe};
}

template <typename T>
jsi::Value ValueInterpolator<T>::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  updateCurrentKeyframes(rt, shadowNode);

  std::optional<T> fromValue = keyframeBefore_.value;
  std::optional<T> toValue = keyframeAfter_.value;

  if (!fromValue.has_value()) {
    fromValue = getFallbackValue(rt, shadowNode);
  }
  if (!toValue.has_value()) {
    toValue = getFallbackValue(rt, shadowNode);
  }

  const auto keyframeProgress = progressProvider_->getKeyframeProgress(
      keyframeBefore_.offset, keyframeAfter_.offset);

  // If at least one of keyframes has no value set and there is no fallback
  // value, interpolate as if values were discrete
  if (!fromValue.has_value() || !toValue.has_value()) {
    return interpolateMissingValue(rt, keyframeProgress, fromValue, toValue);
  }

  T value;
  if (keyframeProgress == 1.0) {
    value = toValue.value();
  } else if (keyframeProgress == 0.0) {
    value = fromValue.value();
  } else {
    value = interpolate(
        keyframeProgress,
        fromValue.value(),
        toValue.value(),
        {.node = shadowNode});
  }
  previousValue_ = value;

  return convertResultToJSI(rt, value);
}

template <typename T>
jsi::Value ValueInterpolator<T>::reset(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  previousValue_ = std::nullopt;
  auto resetValue = getStyleValue(rt, shadowNode);

  if (!resetValue.isUndefined()) {
    return convertResultToJSI(rt, prepareKeyframeValue(rt, resetValue));
  }
  if (defaultStyleValue_.has_value()) {
    return convertResultToJSI(rt, defaultStyleValue_.value());
  }

  return resetValue;
}

template <typename T>
std::optional<T> ValueInterpolator<T>::getFallbackValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  const jsi::Value &styleValue = getStyleValue(rt, shadowNode);
  return styleValue.isUndefined() ? defaultStyleValue_
                                  : prepareKeyframeValue(rt, styleValue);
}

template <typename T>
std::optional<T> ValueInterpolator<T>::resolveKeyframeValue(
    const std::optional<T> &unresolvedValue,
    const ShadowNode::Shared &shadowNode) const {
  if (!unresolvedValue.has_value()) {
    return std::nullopt;
  }
  const auto &value = unresolvedValue.value();
  return interpolate(0, value, value, {.node = shadowNode});
}

template <typename T>
ValueKeyframe<T> ValueInterpolator<T>::getKeyframeAtIndex(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    size_t index,
    bool shouldResolve) const {
  const auto &keyframe = keyframes_.at(index);

  if (shouldResolve) {
    const double offset = keyframe.offset;
    T unresolvedValue;

    if (keyframe.value.has_value()) {
      unresolvedValue = keyframe.value.value();
    } else {
      const auto fallbackValue = getFallbackValue(rt, shadowNode);
      if (fallbackValue.has_value()) {
        unresolvedValue = fallbackValue.value();
      } else {
        return ValueKeyframe<T>{offset, std::nullopt};
      }
    }

    return ValueKeyframe<T>{
        offset, resolveKeyframeValue(unresolvedValue, shadowNode)};
  }

  return keyframe;
}

template <typename T>
void ValueInterpolator<T>::updateCurrentKeyframes(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  const auto progress = progressProvider_->getGlobalProgress();
  const bool isProgressLessThanHalf = progress < 0.5;
  const auto prevAfterIndex = keyframeAfterIndex_;

  if (progressProvider_->isFirstUpdate()) {
    keyframeAfterIndex_ = isProgressLessThanHalf ? 1 : keyframes_.size() - 1;
  }

  while (keyframeAfterIndex_ < keyframes_.size() - 1 &&
         keyframes_[keyframeAfterIndex_].offset < progress)
    ++keyframeAfterIndex_;

  while (keyframeAfterIndex_ > 1 &&
         keyframes_[keyframeAfterIndex_ - 1].offset >= progress)
    --keyframeAfterIndex_;

  if (progressProvider_->isFirstUpdate()) {
    // Set initial keyframes if it's the first update
    keyframeBefore_ = getKeyframeAtIndex(
        rt,
        shadowNode,
        keyframeAfterIndex_ - 1,
        isResolvable() && isProgressLessThanHalf);
    keyframeAfter_ = getKeyframeAtIndex(
        rt,
        shadowNode,
        keyframeAfterIndex_,
        isResolvable() && !isProgressLessThanHalf);
  } else if (keyframeAfterIndex_ != prevAfterIndex) {
    // Update keyframes if the current keyframe index has changed
    keyframeBefore_ = getKeyframeAtIndex(
        rt,
        shadowNode,
        keyframeAfterIndex_ - 1,
        isResolvable() && keyframeAfterIndex_ > prevAfterIndex);
    keyframeAfter_ = getKeyframeAtIndex(
        rt,
        shadowNode,
        keyframeAfterIndex_,
        isResolvable() && keyframeAfterIndex_ < prevAfterIndex);
  }
}

template <typename T>
jsi::Value ValueInterpolator<T>::interpolateMissingValue(
    jsi::Runtime &rt,
    double progress,
    const std::optional<T> &fromValue,
    const std::optional<T> &toValue) const {
  return convertOptionalToJSI(rt, progress < 0.5 ? fromValue : toValue);
}

template <typename T>
jsi::Value ValueInterpolator<T>::convertOptionalToJSI(
    jsi::Runtime &rt,
    const std::optional<T> &value) const {
  return value.has_value() ? convertResultToJSI(rt, value.value())
                           : jsi::Value::undefined();
}

// Declare the types that will be used in the ValueInterpolator class
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<Color>;
template class ValueInterpolator<UnitValue>;
template class ValueInterpolator<TransformOrigin>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
