#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <reanimated/CSS/utils/reversingShortening.h>

#include <jsi/JSIDynamic.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransition::CSSPlatformTransition(
    const Tag viewTag,
    const std::shared_ptr<CSSPlatformTransitionProxy> &proxy)
    : viewTag_(viewTag), proxy_(proxy) {}

folly::dynamic CSSPlatformTransition::run(jsi::Runtime &rt, const CSSTransitionConfig &config, const double timestamp) {
  folly::dynamic initialUpdate = folly::dynamic::object();

  for (const auto &[propertyName, settings] : config.changedProperties) {
    runProperty(rt, propertyName, settings, initialUpdate, timestamp);
  }

  for (const auto &propertyName : config.removedProperties) {
    cancel(propertyName);
  }

  return initialUpdate;
}

void CSSPlatformTransition::runProperty(
    jsi::Runtime &rt,
    const std::string &propertyName,
    const CSSTransitionPropertySettings &settings,
    folly::dynamic &initialUpdate,
    const double timestamp) {
  auto toValue = jsi::dynamicFromValue(rt, settings.value.second);

  const auto activeIt = activeProperties_.find(propertyName);
  auto *prev =
      activeIt != activeProperties_.end() && toValue == activeIt->second.adjustedStart ? &activeIt->second : nullptr;
  auto rs = prev ? reverseShorten(prev->previous, timestamp, settings.duration, settings.delay, settings.easingConfig)
                 : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  proxy_->run(CSSPlatformTransitionPropertyConfig{
      viewTag_, propertyName, toValue, rs.duration, rs.startTimestamp, settings.easingConfig});

  // Settle the model layer on toValue so RN's view stays there once the
  // native animation completes.
  initialUpdate[propertyName] = toValue;

  activeProperties_[propertyName] = ActiveProperty{
      prev ? std::move(prev->adjustedEnd) : jsi::dynamicFromValue(rt, settings.value.first),
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
