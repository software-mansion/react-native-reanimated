#include <reanimated/CSS/util/keyframes.h>

namespace reanimated::css {

std::vector<std::pair<double, folly::dynamic>> parseDynamicKeyframes(
    const folly::dynamic &keyframes) {
  if (!keyframes.isArray()) {
    throw std::invalid_argument(
        "[Reanimated] Keyframes must be an array of keyframe objects");
  }

  const auto keyframesCount = keyframes.size();
  const bool hasOffset0 = keyframes[0]["offset"].asDouble() == 0;
  const bool hasOffset1 =
      keyframes[keyframesCount - 1]["offset"].asDouble() == 1;

  std::vector<std::pair<double, folly::dynamic>> result;
  result.reserve(keyframesCount + (hasOffset0 ? 0 : 1) + (hasOffset1 ? 0 : 1));

  // Insert the keyframe without value at offset 0 if it is not present
  if (!hasOffset0) {
    result.emplace_back(0.0, folly::dynamic());
  }

  // Insert all provided keyframes
  for (size_t i = 0; i < keyframesCount; ++i) {
    const auto &keyframeObject = keyframes[i];
    double offset = keyframeObject["offset"].asDouble();
    result.emplace_back(offset, std::move(keyframeObject["value"]));
  }

  // Insert the keyframe without value at offset 1 if it is not present
  if (!hasOffset1) {
    result.emplace_back(1.0, folly::dynamic());
  }

  return result;
}

} // namespace reanimated::css
