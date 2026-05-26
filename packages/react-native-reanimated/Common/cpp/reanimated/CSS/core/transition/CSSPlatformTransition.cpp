#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <utility>

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

void CSSPlatformTransition::runEntry(
    jsi::Runtime &rt,
    const CSSPlatformTransitionRawEntry &entry,
    const double timestamp) {
  // null/undefined endpoints are resolved to the property's default inside
  // parsePlatformValue; type mismatches and unsupported properties throw.
  auto fromValue = parsePlatformValue(rt, entry.propertyName, entry.valueDiff.first);
  auto toValue = parsePlatformValue(rt, entry.propertyName, entry.valueDiff.second);

  const auto activeIt = activeProperties_.find(entry.propertyName);
  auto *prev =
      activeIt != activeProperties_.end() && toValue == activeIt->second.adjustedStart ? &activeIt->second : nullptr;
  auto rs = prev
      ? reverseShorten(
            prev->previous, timestamp, entry.settings.duration, entry.settings.delay, entry.settings.easingConfig)
      : makeReversingState(timestamp, entry.settings.duration, entry.settings.delay, entry.settings.easingConfig);

  proxy_->run(CSSPlatformTransitionPropertyConfig{
      viewTag_, entry.propertyName, fromValue, toValue, rs.duration, rs.startTimestamp, entry.settings.easingConfig});

  activeProperties_[entry.propertyName] = ActiveProperty{
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
