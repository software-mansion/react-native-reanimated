#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingConfigs.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <array>
#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

// PlatformValue is platform-defined: each platform sets the value shapes it can
// animate natively; shared code only stores and moves values from parse hooks.
#ifdef __APPLE__
#include <reanimated/apple/CSS/REACSSPlatformValue.h>
#endif

namespace reanimated::css {

using namespace facebook;
using namespace react;

#ifndef __APPLE__
using PlatformValue = std::monostate;
#endif

using ParsedPlatformDiffs = std::unordered_map<std::string, std::pair<PlatformValue, PlatformValue>>;

/// A transition endpoint reduced to the shapes platform parsing recognizes,
/// extracted from a jsi::Value or a folly::dynamic into one representation.
/// monostate is a null or absent endpoint, resolved to the property's default.
using CSSEndpointValue = std::variant<std::monostate, double, std::array<double, 2>>;

struct CSSPlatformTransitionPropertyConfig {
  Tag viewTag;
  std::string propertyName;
  PlatformValue fromValue;
  PlatformValue toValue;
  double durationMs;
  double startTimestampMs;
  EasingConfig easing;
};

struct CSSPlatformTransitionEntry {
  std::string propertyName;
  PlatformValue fromValue;
  PlatformValue toValue;
  CSSTransitionPropertySettings settings;
};

struct CSSPlatformTransitionConfig {
  PropertiesSettingsMap changedPropertiesSettings;
  std::vector<CSSPlatformTransitionEntry> changedProperties;
  std::vector<std::string> removedProperties;

  bool empty() const {
    return changedPropertiesSettings.empty() && changedProperties.empty() && removedProperties.empty();
  }
};

/// Whether the platform can animate the property natively for the given easing.
using CSSCanRoutePropertyFunction = std::function<bool(const std::string &propertyName, const EasingConfig &easing)>;
/// Parses an extracted endpoint into the platform's value representation. An
/// empty endpoint resolves to the property's CSS default; nullopt means the
/// value is not expressible natively and the property runs on the loop.
using CSSParseValueFunction =
    std::function<std::optional<PlatformValue>(const std::string &propertyName, const CSSEndpointValue &value)>;
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

  struct ProcessedDynamicDiffs {
    PropertyValueDynamicDiffsMap loop;
    ParsedPlatformDiffs platform;
  };

  CSSPlatformTransitionProxy(
      CSSCanRoutePropertyFunction canRoute,
      CSSParseValueFunction parseValue,
      CSSApplyTransitionFunction applyTransition,
      CSSRemoveTransitionFunction removeTransition);

  void run(const CSSPlatformTransitionPropertyConfig &config) const;
  void remove(Tag viewTag, const std::string &propertyName) const;

  /// Filters the config into loop / platform buckets, emitting implicit cancels
  /// on the old side when a property migrates vs previousRouting. A property
  /// routes to the platform only when canRoute holds and both endpoints parse.
  ProcessedConfig
  processConfig(jsi::Runtime &rt, CSSTransitionConfig &&config, const CSSTransitionRouting &previousRouting) const;

  /// Splits already-routed pseudo-selector toggle diffs into loop / platform
  /// buckets, parsing the platform endpoints; values the platform cannot
  /// express fall back to the loop.
  ProcessedDynamicDiffs processDynamicDiffs(
      const CSSTransitionRouting &routing,
      const PropertyValueDynamicDiffsMap &propertyDiffs) const;

 private:
  bool canRoute(const std::string &propertyName, const EasingConfig &easing) const;
  std::optional<PlatformValue> parseValue(const std::string &propertyName, const CSSEndpointValue &value) const;

  CSSCanRoutePropertyFunction canRoute_;
  CSSParseValueFunction parseValue_;
  CSSApplyTransitionFunction applyTransition_;
  CSSRemoveTransitionFunction removeTransition_;
};

} // namespace reanimated::css
