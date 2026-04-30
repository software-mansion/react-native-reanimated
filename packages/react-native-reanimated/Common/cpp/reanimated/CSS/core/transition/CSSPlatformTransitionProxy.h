#pragma once

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

class CSSPlatformTransitionProxy {
 public:
  struct ProcessedConfig {
    CSSTransitionConfig loop;
    CSSPlatformTransitionConfig platform;
  };

  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  bool canRoute(const std::string &propertyName) const;
  void run(const CSSPlatformTransitionPropertyConfig &config) const;
  void remove(Tag viewTag, const std::string &propertyName) const;
  ProcessedConfig processConfig(jsi::Runtime &rt, Tag viewTag, CSSTransitionConfig &&config) const;

 private:
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
