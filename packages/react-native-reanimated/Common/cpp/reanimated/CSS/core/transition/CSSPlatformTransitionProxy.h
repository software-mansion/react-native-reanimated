#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>

#include <folly/dynamic.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <string>

namespace reanimated::css {

using namespace facebook;
using namespace react;

struct CSSPlatformTransitionPropertyConfig {
  Tag viewTag;
  std::string propertyName;
  folly::dynamic toValue;
  double durationMs;
  double startTimestampMs;
  EasingConfig easing;
};

using CSSCanRoutePropertyFunction = std::function<bool(const std::string &propertyName, const EasingConfig &easing)>;
using CSSApplyTransitionFunction = std::function<void(const CSSPlatformTransitionPropertyConfig &config)>;
using CSSRemoveTransitionFunction = std::function<void(Tag viewTag, const std::string &propertyName)>;

struct CSSTransitionRouting {
  TransitionProperties loop;
  TransitionProperties platform;
};

class CSSPlatformTransitionProxy {
 public:
  struct ProcessedConfig {
    CSSTransitionConfig loop;
    CSSTransitionConfig platform;
    CSSTransitionRouting routing;
  };

  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  void run(const CSSPlatformTransitionPropertyConfig &config) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  // Filters the incoming config into loop/platform buckets and emits implicit
  // cancels on the old side when a property migrates compared to
  // previousRouting. No value conversion or timing math here - the platform
  // side does its own building inside CSSPlatformTransition::run.
  ProcessedConfig processConfig(CSSTransitionConfig &&config, const CSSTransitionRouting &previousRouting) const;

 private:
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;
};

} // namespace reanimated::css
