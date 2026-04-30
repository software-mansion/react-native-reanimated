#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class CSSPlatformTransition {
 public:
  CSSPlatformTransition(Tag viewTag, const std::shared_ptr<CSSPlatformTransitionProxy> &proxy);

  CSSPlatformTransition(const CSSPlatformTransition &) = delete;

  void run(jsi::Runtime &rt, const CSSTransitionConfig &config, double timestamp);

  void cancel(const std::string &propertyName);
  void cancelAll();

 private:
  struct ActiveProperty {
    folly::dynamic adjustedStart;
    folly::dynamic adjustedEnd;
    ReversingState previous;
  };

  void runProperty(
      jsi::Runtime &rt,
      const std::string &propertyName,
      const CSSTransitionPropertySettings &settings,
      double timestamp);

  const Tag viewTag_;
  const std::shared_ptr<CSSPlatformTransitionProxy> proxy_;
  std::unordered_map<std::string, ActiveProperty> activeProperties_;
};

} // namespace reanimated::css
