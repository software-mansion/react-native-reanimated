#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

template <typename T>
ValueInterpolator<T>::ValueInterpolator(
    const std::optional<T> &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath),
      viewStylesRepository_(viewStylesRepository),
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
    }
    // Otherwise, fallback to the default style value is no style value was
    // provided for the view property
    else {
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
    const PropertyInterpolationUpdateContext &context) {
  updateCurrentKeyframes(context);

  const auto localProgress =
      calculateLocalProgress(keyframeBefore_, keyframeAfter_, context);

  std::optional<T> fromValue = keyframeBefore_.value;
  std::optional<T> toValue = keyframeAfter_.value;

  if (!fromValue.has_value()) {
    fromValue = getFallbackValue(context);
  }
  if (!toValue.has_value()) {
    toValue = getFallbackValue(context);
  }

  // If at least one of keyframes has no value set and there is no fallback
  // value, interpolate as if values were discrete
  if (!fromValue.has_value() || !toValue.has_value()) {
    return interpolateMissingValue(localProgress, fromValue, toValue, context);
  }

  T value =
      interpolate(localProgress, fromValue.value(), toValue.value(), context);
  previousValue_ = value;

  return convertResultToJSI(context.rt, value);
}

template <typename T>
std::optional<T> ValueInterpolator<T>::getFallbackValue(
    const PropertyInterpolationUpdateContext context) const {
  const jsi::Value &styleValue = getStyleValue(context.rt, context.node);
  return styleValue.isUndefined()
      ? defaultStyleValue_
      : prepareKeyframeValue(context.rt, styleValue);
}

template <typename T>
std::optional<T> ValueInterpolator<T>::resolveKeyframeValue(
    const std::optional<T> unresolvedValue,
    const PropertyInterpolationUpdateContext context) const {
  if (!unresolvedValue.has_value()) {
    return std::nullopt;
  }
  const auto value = unresolvedValue.value();
  return interpolate(0, value, value, context);
}

template <typename T>
ValueKeyframe<T> ValueInterpolator<T>::getKeyframeAtIndex(
    size_t index,
    bool shouldResolve,
    const PropertyInterpolationUpdateContext context) const {
  const auto keyframe = keyframes_.at(index);
  const double offset = keyframe.offset;

  if (shouldResolve) {
    T unresolvedValue;

    if (keyframe.value.has_value()) {
      unresolvedValue = keyframe.value.value();
    } else {
      const auto fallbackValue = getFallbackValue(context);
      if (fallbackValue.has_value()) {
        unresolvedValue = fallbackValue.value();
      } else {
        return ValueKeyframe<T>{offset, std::nullopt};
      }
    }

    return ValueKeyframe<T>{
        offset, resolveKeyframeValue(unresolvedValue, context)};
  }

  return keyframe;
}

template <typename T>
void ValueInterpolator<T>::updateCurrentKeyframes(
    const PropertyInterpolationUpdateContext context) {
  const bool isProgressLessThanHalf = context.progress < 0.5;
  const auto prevAfterIndex = keyframeAfterIndex_;

  if (!context.previousProgress.has_value()) {
    keyframeAfterIndex_ = isProgressLessThanHalf ? 1 : keyframes_.size() - 1;
  }

  while (keyframeAfterIndex_ < keyframes_.size() - 1 &&
         keyframes_[keyframeAfterIndex_].offset < context.progress)
    ++keyframeAfterIndex_;

  while (keyframeAfterIndex_ > 1 &&
         keyframes_[keyframeAfterIndex_ - 1].offset >= context.progress)
    --keyframeAfterIndex_;

  if (context.previousProgress.has_value()) {
    if (keyframeAfterIndex_ != prevAfterIndex) {
      keyframeBefore_ = getKeyframeAtIndex(
          keyframeAfterIndex_ - 1,
          keyframeAfterIndex_ > prevAfterIndex,
          context);
      keyframeAfter_ = getKeyframeAtIndex(
          keyframeAfterIndex_, keyframeAfterIndex_ < prevAfterIndex, context);
    } else if (context.directionChanged && previousValue_.has_value()) {
      const ValueKeyframe<T> keyframe = {
          context.previousProgress.value(), previousValue_.value()};
      if (context.progress < context.previousProgress.value()) {
        keyframeBefore_ =
            getKeyframeAtIndex(keyframeAfterIndex_ - 1, false, context);
        keyframeAfter_ = keyframe;
      } else {
        keyframeBefore_ = keyframe;
        keyframeAfter_ =
            getKeyframeAtIndex(keyframeAfterIndex_, false, context);
      }
    }
  } else {
    keyframeBefore_ = getKeyframeAtIndex(
        keyframeAfterIndex_ - 1, isProgressLessThanHalf, context);
    keyframeAfter_ = getKeyframeAtIndex(
        keyframeAfterIndex_, !isProgressLessThanHalf, context);
  }
}

template <typename T>
double ValueInterpolator<T>::calculateLocalProgress(
    const ValueKeyframe<T> &keyframeBefore,
    const ValueKeyframe<T> &keyframeAfter,
    const PropertyInterpolationUpdateContext context) const {
  const double beforeOffset = keyframeBefore.offset;
  const double afterOffset = keyframeAfter.offset;

  if (afterOffset == beforeOffset) {
    return 1;
  }

  return (context.progress - beforeOffset) / (afterOffset - beforeOffset);
}

template <typename T>
jsi::Value ValueInterpolator<T>::interpolateMissingValue(
    double localProgress,
    const std::optional<T> &fromValue,
    const std::optional<T> &toValue,
    const PropertyInterpolationUpdateContext context) const {
  return jsi::Value::undefined();
  const auto selectedValue = localProgress < 0.5 ? fromValue : toValue;
  return selectedValue.has_value()
      ? convertResultToJSI(context.rt, selectedValue.value())
      : jsi::Value::undefined();
}

// Declare the types that will be used in the ValueInterpolator class
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<ColorArray>;
template class ValueInterpolator<UnitValue>;

} // namespace reanimated
