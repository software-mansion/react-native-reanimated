#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

template <typename T, typename U>
void ValueInterpolator<T, U>::initialize(
    jsi::Runtime &rt,
    const jsi::Value &keyframeArray) {
  keyframes_ = createKeyframes(rt, keyframeArray.asObject(rt).asArray(rt));
  if (keyframes_->empty()) {
    throw std::invalid_argument("[Reanimated] Keyframes cannot be empty.");
  }
}

template <typename T, typename U>
std::shared_ptr<const std::vector<Keyframe<T>>>
ValueInterpolator<T, U>::createKeyframes(
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

template <typename T, typename U>
U ValueInterpolator<T, U>::resolveKeyframeValue(
    const InterpolationUpdateContext context,
    const T &value) const {
  if constexpr (std::is_same<T, U>::value) {
    return value;
  } else {
    throw std::logic_error(
        "resolveKeyframeValue must be implemented in derived class");
  }
}

template <typename T, typename U>
Keyframe<T> ValueInterpolator<T, U>::getKeyframeAtIndex(size_t index) const {
  if (index < 0) {
    // TODO: Replace this with value read from the view
    return keyframes_->front();
  } else if (index >= keyframes_->size()) {
    // TODO: Replace this with value read from the view
    return keyframes_->back();
  } else {
    return keyframes_->at(index);
  }
}

template <typename T, typename U>
void ValueInterpolator<T, U>::updateCurrentKeyframes(
    const InterpolationUpdateContext context) {
  if (!context.previousProgress.has_value()) {
    keyframeAfterIndex_ = context.progress < 0.5 ? 0 : keyframes_->size();
  }

  const auto &keyframes = *keyframes_;
  const auto prevAfterIndex = keyframeAfterIndex_;

  while (context.progress < 1 && keyframeAfterIndex_ < keyframes.size() &&
         keyframes[keyframeAfterIndex_].offset <= context.progress)
    ++keyframeAfterIndex_;

  while (context.progress > 0 && keyframeAfterIndex_ > 0 &&
         keyframes[keyframeAfterIndex_ - 1].offset > context.progress)
    --keyframeAfterIndex_;

  if (context.previousProgress.has_value()) {
    if (keyframeAfterIndex_ != prevAfterIndex) {
      keyframeBefore_ = getKeyframeAtIndex(keyframeAfterIndex_ - 1);
      keyframeAfter_ = getKeyframeAtIndex(keyframeAfterIndex_);
    }

    if (context.directionChanged) {
      const auto previousProgress = context.previousProgress.value();
      if (context.progress < previousProgress) {
        keyframeAfter_ = {previousProgress, previousValue_};
      } else {
        keyframeBefore_ = {previousProgress, previousValue_};
      }
    }
  } else {
    keyframeBefore_ = getKeyframeAtIndex(keyframeAfterIndex_ - 1);
    keyframeAfter_ = getKeyframeAtIndex(keyframeAfterIndex_);
  }
}

template <typename T, typename U>
jsi::Value ValueInterpolator<T, U>::update(
    const InterpolationUpdateContext context) {
  updateCurrentKeyframes(context);

  double beforeOffset = keyframeBefore_.offset;
  double afterOffset = keyframeAfter_.offset;

  double localProgress = afterOffset == beforeOffset
      ? 1
      : (context.progress - beforeOffset) / (afterOffset - beforeOffset);

  U value = interpolateBetweenKeyframes(
      localProgress,
      resolveKeyframeValue(context, keyframeBefore_.value),
      resolveKeyframeValue(context, keyframeAfter_.value),
      context);
  previousValue_ = value;

  jsi::Runtime &rt = context.rt;
  jsi::Value updates = convertResultToJSI(rt, value);

  return updates;
}

// Declare the types that will be used in the ValueInterpolator class
// by different instantiations of the template.
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<std::vector<double>>;
template class ValueInterpolator<ColorArray>;
template class ValueInterpolator<RelativeInterpolatorValue, double>;

} // namespace reanimated
