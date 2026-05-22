#include <reanimated/CSS/configs/CSSKeyframesConfig.h>

#include <reanimated/CSS/configs/common.h>

#include <memory>
#include <string>

namespace reanimated::css {

std::shared_ptr<AnimationStyleInterpolatorFactory> createStyleInterpolatorFactory(
    jsi::Runtime &rt,
    const jsi::Object &config,
    const std::string &nativeComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  return std::make_shared<AnimationStyleInterpolatorFactory>(
      rt, config.getProperty(rt, "propKeyframes"), nativeComponentName, viewStylesRepository);
}

std::shared_ptr<KeyframeEasingConfigs> getKeyframeTimingConfigs(jsi::Runtime &rt, const jsi::Object &config) {
  KeyframeEasingConfigs result;
  const auto &keyframeTimingConfigs = config.getProperty(rt, "keyframeTimingFunctions").asObject(rt);
  const auto timingConfigOffsets = keyframeTimingConfigs.getPropertyNames(rt);
  const auto timingConfigsCount = timingConfigOffsets.size(rt);

  for (size_t i = 0; i < timingConfigsCount; ++i) {
    const auto offset = timingConfigOffsets.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto easingConfig = getEasingConfig(rt, keyframeTimingConfigs.getProperty(rt, offset.c_str()));

    result[std::stod(offset)] = easingConfig;
  }

  return std::make_shared<KeyframeEasingConfigs>(result);
}

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::string &compoundComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  const auto &configObj = config.asObject(rt);
  const auto nativeComponentName = splitCompoundComponentName(compoundComponentName).first;

  return {
      createStyleInterpolatorFactory(rt, configObj, nativeComponentName, viewStylesRepository),
      getKeyframeTimingConfigs(rt, configObj)};
}

} // namespace reanimated::css
