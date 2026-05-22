#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>

namespace reanimated::css {

CSSPlatformTransition::CSSPlatformTransition(
    const Tag viewTag,
    const std::shared_ptr<CSSPlatformTransitionProxy> &proxy)
    : viewTag_(viewTag), proxy_(proxy) {}

folly::dynamic CSSPlatformTransition::run(const CSSPlatformTransitionConfig &config) {
  folly::dynamic initialUpdate = folly::dynamic::object();

  for (const auto &propertyConfig : config.changedProperties) {
    // The model layer needs to settle on the toValue so RN's view stays at
    // the final state once the native animation completes.
    initialUpdate[propertyConfig.propertyName] = propertyConfig.toValue;
    proxy_->run(propertyConfig);
    activeProperties_.insert(propertyConfig.propertyName);
  }

  for (const auto &propertyName : config.removedProperties) {
    cancel(propertyName);
  }

  return initialUpdate;
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
