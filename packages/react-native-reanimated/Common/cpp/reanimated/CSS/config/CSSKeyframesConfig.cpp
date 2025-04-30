#include <reanimated/CSS/config/CSSKeyframesConfig.h>

namespace reanimated::css {

std::shared_ptr<AnimationStyleInterpolator> getStyleInterpolator(
    const folly::dynamic &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  const auto styleInterpolator =
      std::make_shared<AnimationStyleInterpolator>(viewStylesRepository);

  styleInterpolator->updateKeyframes(config["keyframesStyle"]);

  return styleInterpolator;
}

std::shared_ptr<KeyframeEasingFunctions> getKeyframeTimingFunctions(
    const folly::dynamic &config) {
  KeyframeEasingFunctions result;

  const auto &keyframeTimingFunctions = config["keyframeTimingFunctions"];

  for (const auto &pair : keyframeTimingFunctions.items()) {
    const std::string offset = pair.first.asString();
    const auto &easingFunctionConfig = pair.second;

    result[std::stod(offset)] = createEasingFunction(easingFunctionConfig);
  }

  return std::make_shared<KeyframeEasingFunctions>(result);
}

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    const folly::dynamic &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  return {
      getStyleInterpolator(config, viewStylesRepository),
      getKeyframeTimingFunctions(config)};
}

} // namespace reanimated::css
