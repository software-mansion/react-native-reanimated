#include <reanimated/CSS/config/CSSKeyframesConfig.h>

namespace reanimated::css {

folly::dynamic getKeyframes(jsi::Runtime &rt, const jsi::Object &config) {
  return dynamicFromValue(rt, config.getProperty(rt, "keyframesStyle"));
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

  return std::make_shared<KeyframeEasingFunctions>(result);
}

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);
  return {
      getKeyframes(rt, configObj), getKeyframeTimingFunctions(rt, configObj)};
}

} // namespace reanimated::css
