#include <reanimated/CSS/configs/CSSKeyframesConfig.h>

#include <reanimated/CSS/configs/common.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

std::shared_ptr<KeyframeEasingConfigs> getKeyframeEasingConfigs(jsi::Runtime &rt, const jsi::Object &config) {
  KeyframeEasingConfigs result;
  const auto &keyframeTimingFunctions = config.getProperty(rt, "keyframeTimingFunctions").asObject(rt);
  const auto timingFunctionOffsets = keyframeTimingFunctions.getPropertyNames(rt);
  const auto timingFunctionsCount = timingFunctionOffsets.size(rt);

  for (size_t i = 0; i < timingFunctionsCount; ++i) {
    const auto offset = timingFunctionOffsets.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    result[std::stod(offset)] = getEasingConfig(rt, keyframeTimingFunctions.getProperty(rt, offset.c_str()));
  }

  return std::make_shared<KeyframeEasingConfigs>(result);
}

std::shared_ptr<AnimationStyleInterpolator> createStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &propKeyframes,
    const std::string &nativeComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  return std::make_shared<AnimationStyleInterpolator>(
      rt, jsi::Value(rt, propKeyframes), nativeComponentName, viewStylesRepository);
}

// Extract raw keyframe values for a single property from a JSI keyframes array.
RawPropertyKeyframes extractPropertyKeyframes(jsi::Runtime &rt, const jsi::Array &keyframesArray) {
  const auto kfCount = keyframesArray.size(rt);
  RawPropertyKeyframes rawPropKf;

  for (size_t j = 0; j < kfCount; ++j) {
    const auto kfObj = keyframesArray.getValueAtIndex(rt, j).asObject(rt);
    const auto offset = kfObj.getProperty(rt, "offset").asNumber();
    const auto value = kfObj.getProperty(rt, "value");

    if (value.isUndefined() || value.isNull()) {
      rawPropKf.keyframes.emplace_back(offset, folly::dynamic());
    } else {
      rawPropKf.keyframes.emplace_back(offset, dynamicFromValue(rt, value));
    }
  }

  return rawPropKf;
}

CSSKeyframesConfig parseCSSAnimationKeyframesConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::string &compoundComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::unordered_set<std::string> &platformAnimatableProperties) {
  const auto &configObj = config.asObject(rt);
  const auto nativeComponentName = splitCompoundComponentName(compoundComponentName).first;

  const auto propKeyframes = configObj.getProperty(rt, "propKeyframes").asObject(rt);
  const auto propNames = propKeyframes.getPropertyNames(rt);
  const auto propCount = propNames.size(rt);

  // Split properties: platform-animatable props get raw keyframes,
  // loop props get a filtered JSI object for the style interpolator.
  std::unordered_map<std::string, RawPropertyKeyframes> platformKeyframes;
  jsi::Object loopPropKeyframes(rt);

  for (size_t i = 0; i < propCount; ++i) {
    const auto propName = propNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto &propValue = propKeyframes.getProperty(rt, propName.c_str());

    if (platformAnimatableProperties.count(propName)) {
      platformKeyframes[propName] = extractPropertyKeyframes(rt, propValue.asObject(rt).asArray(rt));
    } else {
      loopPropKeyframes.setProperty(rt, jsi::PropNameID::forUtf8(rt, propName), propValue);
    }
  }

  return {
      createStyleInterpolator(rt, loopPropKeyframes, nativeComponentName, viewStylesRepository),
      getKeyframeEasingConfigs(rt, configObj),
      std::move(platformKeyframes)};
}

} // namespace reanimated::css
