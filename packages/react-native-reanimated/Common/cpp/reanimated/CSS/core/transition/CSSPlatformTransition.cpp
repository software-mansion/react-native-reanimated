#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransition::CSSPlatformTransition(
    const Tag viewTag,
    const std::shared_ptr<CSSPlatformTransitionProxy> &proxy)
    : viewTag_(viewTag), proxy_(proxy) {}

void CSSPlatformTransition::run(jsi::Runtime &rt, const CSSTransitionConfig &config, const double timestamp) {
  for (const auto &[propertyName, settings] : config.changedProperties) {
    runProperty(rt, propertyName, settings, timestamp);
  }

  for (const auto &propertyName : config.removedProperties) {
    cancel(propertyName);
  }
}

void CSSPlatformTransition::runProperty(
    jsi::Runtime &rt,
    const std::string &propertyName,
    const CSSTransitionPropertySettings &settings,
    const double timestamp) {
  // null/undefined endpoints are resolved to the property's default inside
  // parsePlatformValue; type mismatches and unsupported properties throw.
  auto fromValue = parsePlatformValue(rt, propertyName, settings.value.first);
  auto toValue = parsePlatformValue(rt, propertyName, settings.value.second);

  const auto activeIt = activeProperties_.find(propertyName);
  auto *prev =
      activeIt != activeProperties_.end() && toValue == activeIt->second.adjustedStart ? &activeIt->second : nullptr;
  auto rs = prev ? reverseShorten(prev->previous, timestamp, settings.duration, settings.delay, settings.easingConfig)
                 : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  proxy_->run(CSSPlatformTransitionPropertyConfig{
      viewTag_, propertyName, fromValue, toValue, rs.duration, rs.startTimestamp, settings.easingConfig});

  activeProperties_[propertyName] = ActiveProperty{
      prev ? std::move(prev->adjustedEnd) : std::move(fromValue),
      std::move(toValue),
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
