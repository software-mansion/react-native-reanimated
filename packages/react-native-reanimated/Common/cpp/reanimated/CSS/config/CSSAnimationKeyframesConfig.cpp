#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/config/CSSAnimationKeyframesConfig.h>

namespace reanimated {

std::string getAnimationName(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "animationName").asString(rt).utf8(rt);
}

std::shared_ptr<AnimationStyleInterpolator> getStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto styleInterpolator =
      std::make_shared<AnimationStyleInterpolator>(viewStylesRepository_);
  const auto keyframes = config.getProperty(rt, "keyframes");
  styleInterpolator->updateKeyframes(rt, keyframes);

  cssAnimationKeyframesRegistry_->set(animationName, styleInterpolator);
}

std::shared_ptr<KeyframeEasingFunctions> getKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  KeyframeEasingFunctions result;
  const auto &keyframeTimingFunctions =
      config.getProperty(rt, "keyframeTimingFunctions").asObject(rt);
  const auto timingFunctionOffsets =
      keyframeTimingFunctions.getPropertyNames(rt);
  const auto timingFunctionsCount = timingFunctionOffsets.size(rt);

  for (size_t i = 0; i < timingFunctionsCount; ++i) {
    const auto offset =
        timingFunctionOffsets.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto easingFunction = createEasingFunction(
        rt, keyframeTimingFunctions.getProperty(rt, offset.c_str()));

    result[std::stod(offset)] = easingFunction;
  }

  return result;
}

CSSAnimationKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return {
      getAnimationName(rt, config),
      getStyleInterpolator(rt, config),
      getKeyframeTimingFunctions(rt, config)};
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
