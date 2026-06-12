#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <utility>
#include <vector>

namespace reanimated::css {

CSSPlatformTransition::CSSPlatformTransition(
    const Tag viewTag,
    const std::shared_ptr<CSSPlatformTransitionProxy> &proxy)
    : viewTag_(viewTag), proxy_(proxy) {}

void CSSPlatformTransition::run(const CSSPlatformTransitionConfig &config, const double timestamp) {
  for (const auto &entry : config.changedProperties) {
    applyEntry(entry.propertyName, entry.fromValue, entry.toValue, entry.settings, timestamp);
  }

  for (const auto &propertyName : config.removedProperties) {
    cancel(propertyName);
  }
}

void CSSPlatformTransition::run(const ParsedPlatformDiffs &propertiesDiffs, const double timestamp) {
  for (const auto &[propertyName, propertyDiff] : propertiesDiffs) {
    // The routing layer only sends properties registered here, so missing
    // settings are an invariant violation.
    const auto &settings = settings_.at(propertyName);
    applyEntry(propertyName, propertyDiff.first, propertyDiff.second, settings, timestamp);
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
