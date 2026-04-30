#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <folly/dynamic.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class CSSPlatformTransition {
 public:
  CSSPlatformTransition(Tag viewTag, const std::shared_ptr<CSSPlatformTransitionProxy> &proxy);

  CSSPlatformTransition(const CSSPlatformTransition &) = delete;

  folly::dynamic run(const CSSPlatformTransitionConfig &config);

  void cancel(const std::string &propertyName);
  void cancelAll();

 private:
  const Tag viewTag_;
  const std::shared_ptr<CSSPlatformTransitionProxy> proxy_;
  std::unordered_set<std::string> activeProperties_;
};

} // namespace reanimated::css
