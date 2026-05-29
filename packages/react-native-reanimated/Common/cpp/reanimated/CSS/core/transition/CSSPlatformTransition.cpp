#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <utility>
#include <vector>

namespace reanimated::css {

CSSPlatformTransition::CSSPlatformTransition(
    const Tag viewTag,
    const std::shared_ptr<CSSPlatformTransitionProxy> &proxy)
    : viewTag_(viewTag), proxy_(proxy) {}

void CSSPlatformTransition::run(jsi::Runtime &rt, const CSSPlatformTransitionConfig &config, const double timestamp) {
  for (const auto &entry : config.changedProperties) {
    runEntry(rt, entry, timestamp);
  }

  for (const auto &propertyName : config.removedProperties) {
    cancel(propertyName);
  }
}

void CSSPlatformTransition::run(const PropertyValueDynamicDiffsMap &propertiesDiffs, const double timestamp) {
  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    const auto &settings = settings_.at(propertyName);
    auto fromValue = parsePlatformValue(propertyName, propertyDiff.first);
    auto toValue = parsePlatformValue(propertyName, propertyDiff.second);
    applyEntry(propertyName, fromValue, toValue, settings, timestamp);
  }
}

void CSSPlatformTransition::updateSettings(
    const PropertiesSettingsMap &changedPropertiesSettings,
    const std::vector<std::string> &removedProperties) {
  for (const auto &propertyName : removedProperties) {
    settings_.erase(propertyName);
  }
  for (const auto &[propertyName, propertySettings] : changedPropertiesSettings) {
    settings_[propertyName] = propertySettings;
  }
}

void CSSPlatformTransition::runEntry(
    jsi::Runtime &rt,
    const CSSPlatformTransitionRawEntry &entry,
    const double timestamp) {
  // null/undefined endpoints are resolved to the property's default inside
  // parsePlatformValue; type mismatches and unsupported properties throw.
  auto fromValue = parsePlatformValue(rt, entry.propertyName, entry.valueDiff.first);
  auto toValue = parsePlatformValue(rt, entry.propertyName, entry.valueDiff.second);
  applyEntry(entry.propertyName, fromValue, toValue, entry.settings, timestamp);
}

void CSSPlatformTransition::applyEntry(
    const std::string &propertyName,
    PlatformValue fromValue,
    PlatformValue toValue,
    const CSSTransitionPropertySettings &settings,
    const double timestamp) {
  const auto activeIt = activeProperties_.find(propertyName);
  auto *prev =
      activeIt != activeProperties_.end() && toValue == activeIt->second.adjustedStart ? &activeIt->second : nullptr;
  auto rs = prev ? reverseShorten(prev->previous, timestamp, settings.duration, settings.delay, settings.easingConfig)
                 : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  proxy_->run(CSSPlatformTransitionPropertyConfig{
      viewTag_, propertyName, fromValue, toValue, rs.duration, rs.startTimestamp, settings.easingConfig});

  activeProperties_[propertyName] = ActiveProperty{
      prev ? prev->adjustedEnd : fromValue,
      toValue,
      std::move(rs),
  };
}

void CSSPlatformTransition::cancel(const std::string &propertyName) {
  if (activeProperties_.erase(propertyName) > 0) {
    proxy_->remove(viewTag_, propertyName);
  }
}

void CSSPlatformTransition::cancelAll() {
  for (const auto &[propertyName, _] : activeProperties_) {
    proxy_->remove(viewTag_, propertyName);
  }
  activeProperties_.clear();
}

} // namespace reanimated::css
