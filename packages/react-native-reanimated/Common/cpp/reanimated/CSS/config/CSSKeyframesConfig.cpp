#include <reanimated/CSS/config/CSSKeyframesConfig.h>

namespace reanimated::css {

std::shared_ptr<AnimationStyleInterpolator> createStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  const auto styleInterpolator = std::make_shared<AnimationStyleInterpolator>();

  const auto keyframes = config.getProperty(rt, "keyframesStyle");
  styleInterpolator->updateKeyframes(rt, keyframes);

  return styleInterpolator;
}

std::shared_ptr<KeyframeEasings> parseKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  KeyframeEasings result;
  const auto &keyframeTimingFunctions =
      config.getProperty(rt, "keyframeTimingFunctions").asObject(rt);
  const auto timingFunctionOffsets =
      keyframeTimingFunctions.getPropertyNames(rt);
  const auto timingFunctionsCount = timingFunctionOffsets.size(rt);

  for (size_t i = 0; i < timingFunctionsCount; ++i) {
    const auto offset =
        timingFunctionOffsets.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto easing = createOrGetEasing(
        rt, keyframeTimingFunctions.getProperty(rt, offset.c_str()));

    result[std::stod(offset)] = easing;
  }

  return std::make_shared<KeyframeEasings>(result);
}

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);

  return {
      createStyleInterpolator(rt, configObj),
      parseKeyframeTimingFunctions(rt, configObj)};
}

} // namespace reanimated::css
