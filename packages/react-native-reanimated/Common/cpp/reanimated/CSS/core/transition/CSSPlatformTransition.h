#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class CSSPlatformTransition {
 public:
  CSSPlatformTransition(Tag viewTag, const std::shared_ptr<CSSPlatformTransitionProxy> &proxy);

  CSSPlatformTransition(const CSSPlatformTransition &) = delete;

  void run(jsi::Runtime &rt, const CSSPlatformTransitionConfig &config, double timestamp);
  /** TODO: unify folly::dynamic and jsi::value versions */
  void run(const PropertyValueDynamicDiffsMap &propertiesDiffs, double timestamp);

  void updateSettings(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  void cancel(const std::string &propertyName);
  void cancelAll();

 private:
  struct ActiveProperty {
    PlatformValue adjustedStart;
    PlatformValue adjustedEnd;
    ReversingState previous;
  };

  void runEntry(jsi::Runtime &rt, const CSSPlatformTransitionRawEntry &entry, double timestamp);
  void applyEntry(
      const std::string &propertyName,
      PlatformValue fromValue,
      PlatformValue toValue,
      const CSSTransitionPropertySettings &settings,
      double timestamp);

  const Tag viewTag_;
  const std::shared_ptr<CSSPlatformTransitionProxy> proxy_;
  std::unordered_map<std::string, ActiveProperty> activeProperties_;
  PropertiesSettingsMap settings_;
};

} // namespace reanimated::css
