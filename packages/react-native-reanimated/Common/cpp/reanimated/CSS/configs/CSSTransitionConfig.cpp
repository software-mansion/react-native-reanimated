#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/utils/props.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

bool getAllowDiscrete(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "allowDiscrete").asBool();
}

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);
  const auto propertyNames = configObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  CSSTransitionConfig result;

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyValue = configObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    if (propertyValue.isNull() || propertyValue.isUndefined()) {
      result.removedProperties.emplace_back(propertyName);
      continue;
    }

    const auto propertySettingsObj = propertyValue.asObject(rt);
    const auto allowDiscrete = getAllowDiscrete(rt, propertySettingsObj);

    // Inherently-discrete properties without allowDiscrete are not transitioned;
    // route them to removedProperties so any active animation cleans up.
    if (!allowDiscrete && isDiscreteProperty(propertyName, componentName)) {
      result.removedProperties.emplace_back(propertyName);
      continue;
    }

    const auto valueArray = propertySettingsObj.getProperty(rt, "value").asObject(rt).asArray(rt);
    auto oldValue = valueArray.getValueAtIndex(rt, 0);
    auto newValue = valueArray.getValueAtIndex(rt, 1);

    result.changedPropertiesSettings.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(rt, propertySettingsObj),
            getEasingConfig(rt, propertySettingsObj),
            getDelay(rt, propertySettingsObj),
            allowDiscrete,
        });

    result.changedProperties.emplace(propertyName, std::make_pair(std::move(oldValue), std::move(newValue)));
  }

  return result;
}

TransitionTiming makeTiming(const double timestamp, const double duration, const double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

double easedProgressAt(const TransitionTiming &timing, const double timestamp) {
  const double elapsed = timestamp - timing.startTimestamp;
  if (elapsed < 0) {
    return 0;
  }
  const double progress = timing.duration > 0 ? std::min(elapsed / timing.duration, 1.0) : 1.0;
  return getEasingFunctionFromConfig(timing.easing)(progress);
}

TransitionTiming reverseTiming(
    const TransitionTiming &previous,
    const double timestamp,
    double duration,
    double delay,
    EasingConfig easing) {
  // abs and clamp are the spec's guard for easings that overshoot [0, 1].
  const double factor = std::clamp(
      std::abs(easedProgressAt(previous, timestamp) * previous.reversingFactor + (1 - previous.reversingFactor)),
      0.0,
      1.0);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
