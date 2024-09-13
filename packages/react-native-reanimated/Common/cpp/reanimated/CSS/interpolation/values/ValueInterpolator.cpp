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
  size_t keyframeCount = keyframeArray.size(rt);
  std::vector<Keyframe<T>> keyframes;
  keyframes.reserve(keyframeCount);
  for (size_t j = 0; j < keyframeCount; ++j) {
    jsi::Object keyframeObject =
        keyframeArray.getValueAtIndex(rt, j).asObject(rt);

    double offset = keyframeObject.getProperty(rt, "offset").asNumber();
    jsi::Value rawValue = keyframeObject.getProperty(rt, "value");

    T value = prepareKeyframeValue(rt, rawValue);

    keyframes.push_back({offset, value});
  }

  return std::make_shared<const std::vector<Keyframe<T>>>(std::move(keyframes));
}

template <typename T>
T ValueInterpolator<T>::resolveKeyframeValue(
    const T unresolvedValue,
    const InterpolationUpdateContext context) const {
  return interpolate(0, unresolvedValue, unresolvedValue, context);
}

template <typename T>
std::optional<Keyframe<T>> ValueInterpolator<T>::getKeyframeAtIndex(
    int index,
    bool shouldResolve,
    const InterpolationUpdateContext context) const {
  double offset = 0;
  std::optional<T> unresolvedValue;

  if (index < 0 || index >= keyframes_->size()) {
    offset = index < 0 ? 0 : 1;
    if (convertedStyleValue_.has_value()) {
      unresolvedValue = convertedStyleValue_.value();
    }
  } else {
    auto keyframe = keyframes_->at(index);
    offset = keyframe.offset;
    unresolvedValue = keyframe.value;
  }

  if (!unresolvedValue.has_value()) {
    return std::nullopt;
  }

  const T value = shouldResolve
      ? resolveKeyframeValue(unresolvedValue.value(), context)
      : unresolvedValue.value();

  return Keyframe<T>{offset, value};
}

template <typename T>
void ValueInterpolator<T>::updateCurrentKeyframes(
    const InterpolationUpdateContext context) {
  const bool isProgressLessThanHalf = context.progress < 0.5;

  if (!context.previousProgress.has_value()) {
    keyframeAfterIndex_ = isProgressLessThanHalf ? 0 : keyframes_->size();
  }

  const auto &keyframes = *keyframes_;
  const auto prevAfterIndex = keyframeAfterIndex_;

  while (context.progress < 1 && keyframeAfterIndex_ < keyframes.size() &&
         keyframes[keyframeAfterIndex_].offset <= context.progress)
    ++keyframeAfterIndex_;

  while (context.progress > 0 && keyframeAfterIndex_ > 0 &&
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
jsi::Value ValueInterpolator<T>::interpolateMissingKeyframe(
    double localProgress,
    const std::optional<Keyframe<T>> &keyframeBefore,
    const std::optional<Keyframe<T>> &keyframeAfter,
    const InterpolationUpdateContext context) const {
  if (localProgress < 0.5) {
    return keyframeBefore.has_value()
        ? convertResultToJSI(
              context.rt, resolveKeyframeValue(keyframeBefore->value, context))
        : jsi::Value::undefined();
  } else {
    return keyframeAfter.has_value()
        ? convertResultToJSI(
              context.rt, resolveKeyframeValue(keyframeAfter->value, context))
        : jsi::Value::undefined();
  }
}

template <typename T>
double ValueInterpolator<T>::calculateLocalProgress(
    const std::optional<Keyframe<T>> &keyframeBefore,
    const std::optional<Keyframe<T>> &keyframeAfter,
    const InterpolationUpdateContext context) const {
  const double beforeOffset =
      keyframeBefore.has_value() ? keyframeBefore->offset : 0;
  const double afterOffset =
      keyframeAfter.has_value() ? keyframeAfter->offset : 1;

  return afterOffset == beforeOffset
      ? 1
      : (context.progress - beforeOffset) / (afterOffset - beforeOffset);
}

template <typename T>
jsi::Value ValueInterpolator<T>::update(
    const InterpolationUpdateContext context) {
  updateCurrentKeyframes(context);

  const auto localProgress =
      calculateLocalProgress(keyframeBefore_, keyframeAfter_, context);

  if (!keyframeBefore_.has_value() || !keyframeAfter_.has_value()) {
    previousValue_.reset();
    return interpolateMissingKeyframe(
        localProgress, keyframeBefore_, keyframeAfter_, context);
  }

  T value = interpolate(
      localProgress, keyframeBefore_->value, keyframeAfter_->value, context);
  previousValue_ = value;

  return convertResultToJSI(context.rt, value);
}

template <typename T>
jsi::Value ValueInterpolator<T>::reset(
    const InterpolationUpdateContext context) {
  keyframeAfterIndex_ = 0;
  keyframeBefore_.reset();
  keyframeAfter_.reset();
  previousValue_.reset();

  if (convertedStyleValue_.has_value()) {
    return convertResultToJSI(
        context.rt,
        resolveKeyframeValue(convertedStyleValue_.value(), context));
  }

  return jsi::Value::undefined();
}

// Declare the types that will be used in the ValueInterpolator class
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<std::vector<double>>;
template class ValueInterpolator<ColorArray>;
template class ValueInterpolator<RelativeOrNumericInterpolatorValue>;

} // namespace reanimated
