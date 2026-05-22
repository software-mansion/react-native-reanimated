#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

#include <jsi/JSIDynamic.h>

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
    const double /*timestamp*/) {
  // The platform driver only needs the destination value - duration/delay/easing
  // describe the trajectory it should animate along from the current presentation
  // value. We forward the jsi value pair's `second` (toValue) as folly::dynamic.
  auto toValue = jsi::dynamicFromValue(rt, entry.valueDiff.second);

  proxy_->run(CSSPlatformTransitionPropertyConfig{
      viewTag_,
      entry.propertyName,
      std::move(toValue),
      entry.settings.duration,
      entry.settings.delay,
      entry.settings.easingConfig});

  activeProperties_.insert(entry.propertyName);
}

void CSSPlatformTransition::cancel(const std::string &propertyName) {
  if (activeProperties_.erase(propertyName) > 0) {
    proxy_->remove(viewTag_, propertyName);
  }
}

void CSSPlatformTransition::cancelAll() {
  for (const auto &propertyName : activeProperties_) {
    proxy_->remove(viewTag_, propertyName);
  }
  activeProperties_.clear();
}

} // namespace reanimated::css
