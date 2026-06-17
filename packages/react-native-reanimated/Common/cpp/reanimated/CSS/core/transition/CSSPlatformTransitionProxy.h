#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/utils/platform.h>

#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <functional>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

// Fully-parsed property config handed to the platform-side apply callback.
struct CSSPlatformTransitionPropertyConfig {
  Tag viewTag;
  std::string propertyName;
  PlatformValue fromValue;
  PlatformValue toValue;
  double durationMs;
  double startTimestampMs;
  EasingConfig easing;
};

// Raw entry the proxy hands off to CSSPlatformTransition before any value
// parsing happens. Carries the original jsi value pair + timing settings so
// the platform side can convert lazily and inspect both from/to if needed.
struct CSSPlatformTransitionRawEntry {
  std::string propertyName;
  PropertyValueDiff valueDiff;
  CSSTransitionPropertySettings settings;
};

struct CSSPlatformTransitionConfig {
  PropertiesSettingsMap changedPropertiesSettings;
  std::vector<CSSPlatformTransitionRawEntry> changedProperties;
  std::vector<std::string> removedProperties;

  bool empty() const {
    return changedPropertiesSettings.empty() && changedProperties.empty() && removedProperties.empty();
  }
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
    CSSPlatformTransitionConfig platform;
    CSSTransitionRouting routing;
  };

  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  void run(const CSSPlatformTransitionPropertyConfig &config) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  // Filters the incoming config into loop / platform buckets and emits implicit
  // cancels on the old side when a property migrates compared to previousRouting.
  // The platform side does its own value parsing inside CSSPlatformTransition::run -
  // the proxy only forwards the raw jsi value pair via the raw entry.
  ProcessedConfig processConfig(CSSTransitionConfig &&config, const CSSTransitionRouting &previousRouting) const;

 private:
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSApplyTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;
};

} // namespace reanimated::css
