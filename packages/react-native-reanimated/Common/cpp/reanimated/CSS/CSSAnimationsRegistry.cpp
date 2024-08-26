#include <reanimated/CSS/CSSAnimationsRegistry.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    ShadowNode::Shared node,
    const CSSAnimationConfig &config)
    : shadowNode(node),
      state(CSSAnimationState::pending),
      duration(config.animationDuration),
      easingFunction(config.easingFunction),
      keyframedStyle(config.keyframedStyle) {
  currentKeyframeIndexes = buildKeyframeIndexMap();
}

void CSSAnimation::start(time_t timestamp) {
  state = CSSAnimationState::running;
  startTime = timestamp;
}

folly::dynamic CSSAnimation::update(time_t timestamp) {
  double progress = easingFunction((timestamp - startTime) / duration);

  if (progress >= 1.0) {
    progress = 1.0;
    state = CSSAnimationState::finished;
  }

  return applyKeyframeInterpolation(progress);
}

void CSSAnimation::finish() {
  state = CSSAnimationState::finished;
  // TODO: restore original styles if animation-fill-mode is not set
}

void CSSAnimationsRegistry::addAnimation(
    ShadowNode::Shared node,
    const CSSAnimationConfig &config) {
  registry_.emplace_back(node, config);
}

folly::dynamic CSSAnimation::buildKeyframeIndexMap() const {
  return traverseAndConstruct(
      keyframedStyle,
      nullptr,
      [](const folly::dynamic &keyframes, folly::dynamic *) {
        // Replace keyframe arrays with 0 in the index map
        return 0;
      });
}

folly::dynamic CSSAnimation::applyKeyframeInterpolation(double progress) {
  return traverseAndConstruct(
      keyframedStyle,
      &currentKeyframeIndexes,
      [&](const folly::dynamic &keyframes,
          folly::dynamic *currentIndex) -> folly::dynamic {
        size_t index = static_cast<size_t>(currentIndex->asInt());

        while (index < keyframes.size() - 1 &&
               keyframes[index + 1]["offset"].asDouble() <= progress) {
          index++;
        }

        *currentIndex = static_cast<int64_t>(index);

        const auto &fromKeyframe = keyframes[index];
        const auto &toKeyframe =
            keyframes[index < keyframes.size() - 1 ? index + 1 : index];

        if (progress == 1.0) {
          return toKeyframe["value"];
        }

        double fromOffset = fromKeyframe["offset"].asDouble();
        double toOffset = toKeyframe["offset"].asDouble();

        double localProgress = (toOffset > fromOffset)
            ? (progress - fromOffset) / (toOffset - fromOffset)
            : 1.0;

        double fromValue = fromKeyframe["value"].asDouble();
        double toValue = toKeyframe["value"].asDouble();
        return fromValue + localProgress * (toValue - fromValue);
      });
}

folly::dynamic CSSAnimation::traverseAndConstruct(
    const folly::dynamic &value,
    folly::dynamic *currentIndex,
    std::function<folly::dynamic(
        const folly::dynamic &keyframes,
        folly::dynamic *currentIndex)> callback) const {
  if (value.isArray() && !value.empty() && value[0].isObject() &&
      value[0].count("offset") && value[0].count("value")) {
    // If this is an array of keyframes, call the callback with the current
    // index
    return callback(value, currentIndex);
  } else if (value.isObject()) {
    folly::dynamic result = folly::dynamic::object();
    for (const auto &pair : value.items()) {
      result[pair.first.asString()] = traverseAndConstruct(
          pair.second,
          currentIndex ? &(*currentIndex)[pair.first] : nullptr,
          callback);
    }
    return result;
  } else if (value.isArray()) {
    folly::dynamic result = folly::dynamic::array();
    for (size_t i = 0; i < value.size(); ++i) {
      result.push_back(traverseAndConstruct(
          value[i], currentIndex ? &(*currentIndex)[i] : nullptr, callback));
    }
    return result;
  }
  // Leaf nodes or unexpected structure
  throw std::runtime_error(
      "[Reanimated] Unexpected value type encountered during CSS animation keyframes traversal. Value: " +
      value.asString());
}

} // namespace reanimated
