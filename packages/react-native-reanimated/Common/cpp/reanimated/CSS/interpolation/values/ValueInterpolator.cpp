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
  fromKeyframeIndex_ = 0;
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

    T value = convertValue(rt, rawValue);

    keyframes.push_back({offset, value});
  }

  return std::make_shared<const std::vector<Keyframe<T>>>(std::move(keyframes));
}

template <typename T>
void ValueInterpolator<T>::updateFromKeyframeIndex(double progress) {
  const auto &keyframes = *keyframes_;

  // Handle the case where there is no initial keyframe
  if (keyframes[0].offset > 0 && progress < keyframes[0].offset) {
    fromKeyframeIndex_ = -1;
    return;
  }

  // Handle the case where there is no final keyframe
  if (keyframes.back().offset < 1 && progress > keyframes.back().offset) {
    fromKeyframeIndex_ = keyframes.size() - 1;
    return;
  }

  // If the progress is decreasing, move the index backwards
  while (fromKeyframeIndex_ > 0 &&
         progress < keyframes[fromKeyframeIndex_].offset) {
    --fromKeyframeIndex_;
  }

  // If the progress is increasing, move the index forwards
  while (fromKeyframeIndex_ < static_cast<int>(keyframes.size()) - 2 &&
         progress >= keyframes[fromKeyframeIndex_ + 1].offset) {
    ++fromKeyframeIndex_;
  }
}

template <typename T>
std::pair<Keyframe<T>, Keyframe<T>> ValueInterpolator<T>::getKeyframePair(
    double progress) const {
  const auto &keyframes = *keyframes_;

  // Handle the case where there is no initial keyframe
  if (fromKeyframeIndex_ == -1) {
    return {keyframes.front(), keyframes.front()};
  }

  // Handle the case where there is no final keyframe
  if (fromKeyframeIndex_ == static_cast<int>(keyframes.size()) - 1) {
    return {keyframes.back(), keyframes.back()};
  }

  // Return the current keyframe pair
  return {keyframes[fromKeyframeIndex_], keyframes[fromKeyframeIndex_ + 1]};
}

template <typename T>
double ValueInterpolator<T>::calculateLocalProgress(double progress) const {
  auto [fromKeyframe, toKeyframe] = getKeyframePair(progress);

  double fromOffset = fromKeyframe.offset;
  double toOffset = toKeyframe.offset;

  return toOffset != fromOffset
      ? (progress - fromOffset) / (toOffset - fromOffset)
      : 1.0;
}

template <typename T>
jsi::Value ValueInterpolator<T>::update(
    const InterpolationUpdateContext context) {
  const auto progress = context.progress;
  updateFromKeyframeIndex(progress);

  auto [fromKeyframe, toKeyframe] = getKeyframePair(progress);
  double localProgress = calculateLocalProgress(progress);
  T interpolatedValue =
      interpolate(localProgress, fromKeyframe.value, toKeyframe.value);

  return convertToJSIValue(context.rt, interpolatedValue);
}

// Declare the types that will be used in the ValueInterpolator class
// by different instantiations of the template.
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<std::vector<double>>;

} // namespace reanimated
