#include <reanimated/CSS/configs/CSSTransitionConfig.h>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &componentName) {
  const auto &interpolators = getComponentInterpolators(componentName);
  const auto it = interpolators.find(propName);
  if (it == interpolators.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

ChangedProps parseChangedPropsFromDiff(jsi::Runtime &rt, const jsi::Value &diff) {
  folly::dynamic oldProps = folly::dynamic::object();
  folly::dynamic newProps = folly::dynamic::object();
  PropertyNames changedPropertyNames;
  PropertyNames removedPropertyNames;

  const auto diffObj = diff.asObject(rt);
  const auto propertyNames = diffObj.getPropertyNames(rt);
  const auto proeprtiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < proeprtiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyDiff = diffObj.getProperty(rt, propertyName.c_str());

    if (propertyDiff.isNull()) {
      removedPropertyNames.emplace_back(propertyName);
      continue;
    }

    changedPropertyNames.emplace_back(propertyName);

    const auto propertyDiffArray = propertyDiff.asObject(rt).asArray(rt);
    // TODO: Remove the use of folly::dynamic in the next PR
    oldProps[propertyName] = jsi::dynamicFromValue(rt, propertyDiffArray.getValueAtIndex(rt, 0));
    newProps[propertyName] = jsi::dynamicFromValue(rt, propertyDiffArray.getValueAtIndex(rt, 1));
  }

  return ChangedProps{oldProps, newProps, changedPropertyNames, removedPropertyNames};
}

CSSTransitionPropertiesSettings parseCSSTransitionPropertiesSettings(jsi::Runtime &rt, const jsi::Value &settings) {
  const auto settingsObj = settings.asObject(rt);
  CSSTransitionPropertiesSettings result;

  const auto propertyNames = settingsObj.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertySettings = settingsObj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName)).asObject(rt);

    result.emplace(
        propertyName,
        CSSTransitionPropertySettings{
            getDuration(rt, propertySettings),
            getTimingFunction(rt, propertySettings),
            getDelay(rt, propertySettings),
            getAllowDiscrete(rt, propertySettings)});
  }

  return result;
}

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config) {
  const auto configObj = config.asObject(rt);

  const auto changedProps = parseChangedPropsFromDiff(rt, configObj.getProperty(rt, "changedProps"));
  const auto propertySettings = parseCSSTransitionPropertiesSettings(rt, configObj.getProperty(rt, "propertiesSettings"));

  
}

CSSTransitionPropertySettings getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName) {
  // Try to use property specific settings first
  const auto &propIt = propertiesSettings.find(propName);
  if (propIt != propertiesSettings.end()) {
    return propIt->second;
  }
  // Fallback to "all" settings if no property specific settings are available
  const auto &allIt = propertiesSettings.find("all");
  if (allIt != propertiesSettings.end()) {
    return allIt->second;
  }

  throw std::invalid_argument(
      "[Reanimated] Internal error: Settings for '" + propName + "' CSS transition property not found");
}

} // namespace reanimated::css
