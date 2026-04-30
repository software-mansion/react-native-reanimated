#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

struct CSSPlatformTransitionPropertyConfig {
  Tag viewTag;
  std::string propertyName;
  folly::dynamic toValue;
  double duration; // ms
  double delay; // ms
  EasingConfig easing;
};

using CSSPlatformTransitionConfig = CSSTransitionConfigBase<std::vector<CSSPlatformTransitionPropertyConfig>>;

using CSSCanRoutePropertyFunction = std::function<bool(const std::string &propertyName)>;
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
    CSSPlatformTransitionConfig platform;
    CSSTransitionRouting routing;
  };

  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  void run(const CSSPlatformTransitionPropertyConfig &config) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  // Splits the new config across loop/platform sides given the previous
  // call's routing decisions. When a property's side flips compared to
  // previousRouting, the old side receives an implicit cancel so two engines
  // never drive the same prop.
  ProcessedConfig processConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      CSSTransitionConfig &&config,
      const CSSTransitionRouting &previousRouting) const;

 private:
  bool canRoute(const std::string &propertyName) const;
  CSSPlatformTransitionPropertyConfig buildPropertyConfig(
      jsi::Runtime &rt,
      Tag viewTag,
      const std::string &propertyName,
      const CSSTransitionPropertySettings &propertySettings) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;
};

} // namespace reanimated::css
