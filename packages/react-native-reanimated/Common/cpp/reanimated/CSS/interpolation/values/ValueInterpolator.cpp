#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

template <typename T>
void ValueInterpolator<T>::initialize(
    jsi::Runtime &rt,
    const jsi::Value &keyframeArray) {
  keyframes_ = createKeyframes(rt, keyframeArray.asObject(rt).asArray(rt));
  if (keyframes_->empty()) {
    throw std::invalid_argument("[Reanimated] Keyframes cannot be empty.");
  }
}

template <typename T>
void ValueInterpolator<T>::setFallbackValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  if (value.isUndefined()) {
    convertedStyleValue_ = defaultStyleValue_;
    return;
  }

  try {
    convertedStyleValue_ = prepareKeyframeValue(rt, value);
  } catch (const std::exception &e) {
    convertedStyleValue_.reset();
  }
}

template <typename T>
std::shared_ptr<const std::vector<Keyframe<T>>>
ValueInterpolator<T>::createKeyframes(
    jsi::Runtime &rt,
    const jsi::Array &keyframeArray) const {
  const size_t inputKeyframesCount = keyframeArray.size(rt);

  auto getKeyframeAtIndexOffset = [&](size_t index) {
    return keyframeArray.getValueAtIndex(rt, index)
        .asObject(rt)
        .getProperty(rt, "offset")
        .asNumber();
  };

  bool hasOffset0 = getKeyframeAtIndexOffset(0) == 0;
  bool hasOffset1 = getKeyframeAtIndexOffset(inputKeyframesCount - 1) == 1;

  // Reserve space for the constant keyframes vector
  std::vector<Keyframe<T>> keyframes_;
  keyframes_.reserve(
      inputKeyframesCount + (hasOffset0 ? 0 : 1) + (hasOffset1 ? 0 : 1));

  // Insert the keyframe without value at offset 0 if it is not present
  if (!hasOffset0) {
    keyframes_.push_back({0, std::nullopt});
  }

  // Insert all provided keyframes
  for (size_t j = 0; j < inputKeyframesCount; ++j) {
    jsi::Object keyframeObject =
        keyframeArray.getValueAtIndex(rt, j).asObject(rt);
    double offset = keyframeObject.getProperty(rt, "offset").asNumber();
    jsi::Value value = keyframeObject.getProperty(rt, "value");

    // Add a keyframe with no value if there is not keyframe value specified
    if (value.isUndefined()) {
      keyframes_.push_back({offset, std::nullopt});
    } else {
      keyframes_.push_back({offset, prepareKeyframeValue(rt, value)});
    }
  }

  // Insert the keyframe without value at offset 1 if it is not present
  if (!hasOffset1) {
    keyframes_.push_back({1, std::nullopt});
  }

  return std::make_shared<std::vector<Keyframe<T>>>(std::move(keyframes_));
}

template <typename T>
std::optional<T> ValueInterpolator<T>::resolveKeyframeValue(
    const std::optional<T> unresolvedValue,
    const InterpolationUpdateContext context) const {
  if (!unresolvedValue.has_value()) {
    return std::nullopt;
  }
  const auto value = unresolvedValue.value();
  return interpolate(0, value, value, context);
}

template <typename T>
Keyframe<T> ValueInterpolator<T>::getKeyframeAtIndex(
    int index,
    bool shouldResolve,
    const InterpolationUpdateContext context) const {
  // This should never happen
  if (index < 0 || index >= keyframes_->size()) {
    throw std::invalid_argument("[Reanimated] Keyframe index out of bounds.");
  }

  const auto keyframe = keyframes_->at(index);
  const double offset = keyframe.offset;

  if (shouldResolve) {
    T unresolvedValue;

    if (keyframe.value.has_value()) {
      unresolvedValue = keyframe.value.value();
    } else if (convertedStyleValue_.has_value()) {
      unresolvedValue = convertedStyleValue_.value();
    } else {
      return Keyframe<T>{offset, std::nullopt};
    }

    return Keyframe<T>{offset, resolveKeyframeValue(unresolvedValue, context)};
  }

  return keyframe;
}

template <typename T>
void ValueInterpolator<T>::updateCurrentKeyframes(
    const InterpolationUpdateContext context) {
  const bool isProgressLessThanHalf = context.progress < 0.5;

  if (!context.previousProgress.has_value()) {
    keyframeAfterIndex_ = isProgressLessThanHalf ? 1 : keyframes_->size() - 1;
  }

  const auto &keyframes = *keyframes_;
  const auto prevAfterIndex = keyframeAfterIndex_;

  while (context.progress < 1 && keyframeAfterIndex_ < keyframes.size() - 1 &&
         keyframes[keyframeAfterIndex_].offset <= context.progress)
    ++keyframeAfterIndex_;

  while (context.progress > 0 && keyframeAfterIndex_ > 1 &&
         keyframes[keyframeAfterIndex_ - 1].offset >= context.progress)
    --keyframeAfterIndex_;

  if (context.previousProgress.has_value()) {
    if (keyframeAfterIndex_ != prevAfterIndex) {
      keyframeBefore_ = getKeyframeAtIndex(
          keyframeAfterIndex_ - 1,
          keyframeAfterIndex_ > prevAfterIndex,
          context);
      keyframeAfter_ = getKeyframeAtIndex(
          keyframeAfterIndex_, keyframeAfterIndex_ < prevAfterIndex, context);
    }

    if (context.directionChanged && previousValue_.has_value()) {
      const Keyframe<T> keyframe = {
          context.previousProgress.value(), previousValue_.value()};
      if (context.progress < context.previousProgress.value()) {
        keyframeAfter_ = keyframe;
      } else {
        keyframeBefore_ = keyframe;
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
    const Keyframe<T> &keyframeBefore,
    const Keyframe<T> &keyframeAfter,
    const InterpolationUpdateContext context) const {
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
    const InterpolationUpdateContext context) const {
  return jsi::Value::undefined();
  const auto selectedValue = localProgress < 0.5 ? fromValue : toValue;
  return selectedValue.has_value()
      ? convertResultToJSI(context.rt, selectedValue.value())
      : jsi::Value::undefined();
}

template <typename T>
jsi::Value ValueInterpolator<T>::update(
    const InterpolationUpdateContext context) {
  updateCurrentKeyframes(context);

  const auto localProgress =
      calculateLocalProgress(keyframeBefore_, keyframeAfter_, context);

  const std::optional<T> fromValue = keyframeBefore_.value;
  const std::optional<T> toValue = keyframeAfter_.value;

  // If at least one of keyframes has no value set and there is no fallback
  // value, interpolate as if values were discrete
  if ((!fromValue.has_value() || !toValue.has_value()) &&
      !convertedStyleValue_.has_value()) {
    return interpolateMissingValue(localProgress, fromValue, toValue, context);
  }

  T value = interpolate(
      localProgress,
      fromValue.has_value() ? fromValue.value() : convertedStyleValue_.value(),
      toValue.has_value() ? toValue.value() : convertedStyleValue_.value(),
      context);
  previousValue_ = value;

  return convertResultToJSI(context.rt, value);
}

template <typename T>
jsi::Value ValueInterpolator<T>::reset(
    const InterpolationUpdateContext context) {
  keyframeAfterIndex_ = 0;
  keyframeBefore_.value.reset();
  keyframeAfter_.value.reset();
  previousValue_.reset();

  const auto resolvedValue =
      resolveKeyframeValue(convertedStyleValue_, context);

  return resolvedValue.has_value()
      ? convertResultToJSI(context.rt, resolvedValue.value())
      : jsi::Value::undefined();
}

// Declare the types that will be used in the ValueInterpolator class
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<std::vector<double>>;
template class ValueInterpolator<ColorArray>;
template class ValueInterpolator<RelativeOrNumericInterpolatorValue>;

} // namespace reanimated
