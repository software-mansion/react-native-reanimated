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
void ValueInterpolator<T>::updateCurrentKeyframes(
    const InterpolationUpdateContext context) {
  const auto &keyframes = *keyframes_;
  const auto prevAfterIndex = keyframeAfterIndex_;

  while (context.progress < 1 && keyframeAfterIndex_ < keyframes.size() &&
         keyframes[keyframeAfterIndex_].offset <= context.progress)
    ++keyframeAfterIndex_;

  while (context.progress > 0 && keyframeAfterIndex_ > 0 &&
         keyframes[keyframeAfterIndex_ - 1].offset > context.progress)
    --keyframeAfterIndex_;

  if (context.previousProgress.has_value()) {
    const auto previousProgress = context.previousProgress.value();
    if (keyframeAfterIndex_ > prevAfterIndex) {
      LOG(INFO) << "keyframeAfterIndex_ > prevAfterIndex: "
                << keyframeAfterIndex_ << " > " << prevAfterIndex;
      // Store the previous interpolation result instead of the keyframe
      // from the keyframes array to ensure that value from which the
      // interpolation starts doesn't change (e.g. if the keyframe value
      // was relative to the parent view and the parent view changed).
      keyframeBefore_ = {previousProgress, previousValue_};
      keyframeAfter_ = keyframeAfterIndex_ < keyframes.size()
          ? keyframes[keyframeAfterIndex_]
          : keyframes
                .back(); // TODO: Replace this with value read from the view
    } else if (keyframeAfterIndex_ < prevAfterIndex) {
      LOG(INFO) << "keyframeAfterIndex_ < prevAfterIndex: "
                << keyframeAfterIndex_ << " < " << prevAfterIndex;
      keyframeBefore_ = keyframeAfterIndex_ > 0
          ? keyframes[keyframeAfterIndex_ - 1]
          : keyframes
                .front(); // TODO: Replace this with value read from the view
      // Store previous value for the same reason as above.
      keyframeAfter_ = {previousProgress, previousValue_};
    }

    if (context.directionChanged) {
      LOG(INFO) << "Direction changed";
      if (context.progress < previousProgress) {
        LOG(INFO) << "Progress < previousProgress";
        keyframeAfter_ = {previousProgress, previousValue_};
      } else {
        LOG(INFO) << "Progress >= previousProgress";
        keyframeBefore_ = {previousProgress, previousValue_};
      }
    }
  } else {
    LOG(INFO) << "No previous progress, keyframeAfterIndex_: "
              << keyframeAfterIndex_;
    keyframeBefore_ = keyframeAfterIndex_ > 0
        ? keyframes[keyframeAfterIndex_ - 1]
        : keyframes.front(); // TODO: Replace this with value read from the view
    keyframeAfter_ = keyframeAfterIndex_ < keyframes.size()
        ? keyframes[keyframeAfterIndex_]
        : keyframes.back(); // TODO: Replace this with value read from the view
    LOG(INFO) << "keyframeBefore_: " << keyframeBefore_.offset
              << ", keyframeAfter_: " << keyframeAfter_.offset;
  }
}

template <typename T>
jsi::Value ValueInterpolator<T>::update(
    const InterpolationUpdateContext context) {
  updateCurrentKeyframes(context);

  double beforeOffset = keyframeBefore_.offset;
  double afterOffset = keyframeAfter_.offset;

  double localProgress = afterOffset == beforeOffset
      ? 1
      : (context.progress - beforeOffset) / (afterOffset - beforeOffset);

  T value = interpolate(
      localProgress, keyframeBefore_.value, keyframeAfter_.value, context);
  previousValue_ = value;

  jsi::Runtime &rt = context.rt;
  jsi::Value updates = convertToJSIValue(rt, value);

  LOG(INFO) << " CSS animation updates: " << stringifyJSIValue(rt, updates)
            << ", progress: " << context.progress;

  return updates;
}

// Declare the types that will be used in the ValueInterpolator class
// by different instantiations of the template.
template class ValueInterpolator<int>;
template class ValueInterpolator<double>;
template class ValueInterpolator<std::string>;
template class ValueInterpolator<std::vector<double>>;
template class ValueInterpolator<RelativeInterpolatorValue>;

} // namespace reanimated
