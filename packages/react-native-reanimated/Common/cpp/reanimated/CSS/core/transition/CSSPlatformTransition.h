#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
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

  void run(jsi::Runtime &rt, const CSSPlatformTransitionConfig &config);

  void cancel(const std::string &propertyName);
  void cancelAll();

 private:
  void runEntry(jsi::Runtime &rt, const CSSPlatformTransitionRawEntry &entry);

  const Tag viewTag_;
  const std::shared_ptr<CSSPlatformTransitionProxy> proxy_;
  std::unordered_set<std::string> activeProperties_;
};

} // namespace reanimated::css
